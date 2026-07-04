import React from 'react'
import type { TeamMember, TeamRole } from './team.types'

interface TeamMemberListProps {
    members: TeamMember[]
    currentUserId?: string
    onRemove?: (userId: string) => Promise<void>
    onRoleChange?: (userId: string, role: Exclude<TeamRole, 'owner'>) => Promise<void>
}

export function TeamMemberList({ members, currentUserId, onRemove, onRoleChange }: TeamMemberListProps) {
    return (
        <div className="surface-card p-4 space-y-4 text-white">
            <h4 className="font-semibold text-sm text-gray-300 uppercase tracking-wider">Team Members</h4>
            <div className="space-y-3">
                {members.length === 0 ? (
                    <div className="text-sm text-gray-500 py-4 text-center">No members found.</div>
                ) : (
                    members.map((member) => {
                        const userObj = typeof member.userId === 'object' && member.userId ? (member.userId as any) : null;
                        const userIdStr = userObj ? userObj._id : (member.userId as string);
                        const fullName = userObj ? userObj.fullName : (member.user?.fullName || userIdStr);
                        const email = userObj ? userObj.email : (member.user?.email || 'No email available');

                        return (
                            <div key={userIdStr} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-white/5 bg-white/2 hover:bg-white/4 transition-all">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="avatar avatar-md">
                                        {(fullName || 'U').slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-medium text-sm text-white truncate">
                                            {fullName}
                                            {userIdStr === currentUserId && (
                                                <span className="ml-2 badge badge-accent text-[10px] px-1.5 py-0.5">You</span>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-400 truncate mt-0.5">{email}</div>
                                        <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-1.5">
                                            <span className="capitalize">Role: {member.role}</span>
                                            <span>•</span>
                                            <span>Joined: {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 self-end md:self-auto">
                                    {onRoleChange && member.role !== 'owner' && (
                                        <select
                                            value={member.role}
                                            onChange={(event) => onRoleChange(userIdStr, event.target.value as Exclude<TeamRole, 'owner'>)}
                                            className="input py-1 px-2.5 text-xs w-28 bg-white/5 border-white/10"
                                            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: '#fff', outline: 'none' }}
                                        >
                                            <option value="admin">Admin</option>
                                            <option value="member">Member</option>
                                            <option value="guest">Guest</option>
                                        </select>
                                    )}
                                    {onRemove && userIdStr !== currentUserId && member.role !== 'owner' && (
                                        <button
                                            type="button"
                                            onClick={() => onRemove(userIdStr)}
                                            className="btn btn-ghost text-red-400 hover:text-red-300 hover:bg-red-950/20 text-xs px-2.5 py-1.5"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
