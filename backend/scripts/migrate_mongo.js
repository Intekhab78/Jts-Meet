require('dotenv').config();
const mongoose = require('mongoose');

const ATLAS_URI = process.env.ATLAS_URI || process.env.SOURCE_MONGO_URI || '';
const VPS_USER = process.env.VPS_USER || 'jts_meet_user';
const VPS_PASS_RAW = process.env.VPS_PASS || '';
const VPS_PASS_ENCODED = encodeURIComponent(VPS_PASS_RAW);

const VPS_TUNNEL_URI = process.env.TARGET_MONGO_URI || (VPS_PASS_RAW
    ? `mongodb://${VPS_USER}:${VPS_PASS_ENCODED}@127.0.0.1:27018/jts_meet?authSource=jts_meet&directConnection=true`
    : '');
const VPS_ADMIN_AUTH_URI = process.env.VPS_ADMIN_AUTH_URI || (VPS_PASS_RAW
    ? `mongodb://${VPS_USER}:${VPS_PASS_ENCODED}@127.0.0.1:27018/jts_meet?authSource=admin&directConnection=true`
    : '');

async function main() {
    console.log('----------------------------------------------------');
    console.log('1. Connecting to Source (Atlas MongoDB)...');
    const atlasConn = await mongoose.createConnection(ATLAS_URI, { serverSelectionTimeoutMS: 10000 }).asPromise();
    console.log(' Connected to MongoDB Atlas successfully!');

    console.log('\n2. Connecting to Target (VPS MongoDB via SSH Tunnel)...');
    let vpsConn;
    try {
        vpsConn = await mongoose.createConnection(VPS_TUNNEL_URI, { serverSelectionTimeoutMS: 8000, directConnection: true }).asPromise();
        console.log(' Connected to VPS MongoDB (authSource=jts_meet)!');
    } catch (e) {
        console.log('Trying authSource=admin...', e.message);
        vpsConn = await mongoose.createConnection(VPS_ADMIN_AUTH_URI, { serverSelectionTimeoutMS: 8000, directConnection: true }).asPromise();
        console.log(' Connected to VPS MongoDB (authSource=admin)!');
    }

    const atlasDb = atlasConn.db;
    const vpsDb = vpsConn.db;

    const collections = await atlasDb.listCollections().toArray();
    console.log(`\n3. Found ${collections.length} collections to transfer:`);
    collections.forEach(c => console.log(`   - ${c.name}`));

    console.log('\n4. Beginning Full Safe Data Migration (Zero Data Loss)...');
    console.log('----------------------------------------------------');

    const migrationSummary = [];

    for (const collInfo of collections) {
        const collName = collInfo.name;
        if (collName.startsWith('system.')) continue;

        const sourceColl = atlasDb.collection(collName);
        const targetColl = vpsDb.collection(collName);

        const totalDocs = await sourceColl.countDocuments();
        console.log(`\n📦 Migrating collection [${collName}] (${totalDocs} documents)...`);

        if (totalDocs === 0) {
            console.log(`   [${collName}] is empty, creating collection on VPS...`);
            await vpsDb.createCollection(collName).catch(() => {});
            migrationSummary.push({ collection: collName, sourceCount: 0, targetCount: 0, status: 'EMPTY_OK' });
            continue;
        }

        // Fetch all documents from Atlas in batches
        const docs = await sourceColl.find({}).toArray();

        // Safe upsert / insert in target
        const bulkOps = docs.map(doc => ({
            replaceOne: {
                filter: { _id: doc._id },
                replacement: doc,
                upsert: true
            }
        }));

        if (bulkOps.length > 0) {
            const bulkResult = await targetColl.bulkWrite(bulkOps, { ordered: false });
            console.log(`   Transferred: ${bulkResult.upsertedCount + bulkResult.modifiedCount + bulkResult.matchedCount} docs`);
        }

        // Copy indexes (excluding default _id index)
        const indexes = await sourceColl.indexes();
        for (const idx of indexes) {
            if (idx.name === '_id_') continue;
            try {
                const options = { name: idx.name };
                if (idx.unique) options.unique = true;
                if (idx.sparse) options.sparse = true;
                if (idx.expireAfterSeconds !== undefined) options.expireAfterSeconds = idx.expireAfterSeconds;
                await targetColl.createIndex(idx.key, options);
                console.log(`   Index copied: ${idx.name}`);
            } catch (idxErr) {
                console.warn(`   Index warning [${idx.name}]:`, idxErr.message);
            }
        }

        // Verify count
        const targetCount = await targetColl.countDocuments();
        const isMatch = totalDocs === targetCount;
        console.log(`   Verification: Source (${totalDocs}) === Target (${targetCount}) -> ${isMatch ? 'PASSED ✅' : 'MISMATCH ⚠️'}`);

        migrationSummary.push({
            collection: collName,
            sourceCount: totalDocs,
            targetCount,
            status: isMatch ? 'SUCCESS' : 'MISMATCH'
        });
    }

    console.log('\n====================================================');
    console.log('MIGRATION SUMMARY AUDIT REPORT:');
    console.log('====================================================');
    console.table(migrationSummary);

    await atlasConn.close();
    await vpsConn.close();

    const allPassed = migrationSummary.every(s => s.status === 'SUCCESS' || s.status === 'EMPTY_OK');
    if (allPassed) {
        console.log('\n🎉 ALL DATA MIGRATED WITH ZERO DATA LOSS!');
    } else {
        console.error('\n⚠️ Some collections had mismatches. Please review above.');
        process.exit(1);
    }
}

main().catch(err => {
    console.error('Fatal migration error:', err);
    process.exit(1);
});
