import React from 'react'
import type { Organization } from './organization.types'

interface OrganizationSwitcherProps {
    organizations: Organization[]
    currentOrganizationId?: string
    onSelect: (organizationId: string) => void
}

export function OrganizationSwitcher({ organizations, currentOrganizationId, onSelect }: OrganizationSwitcherProps) {
    return (
        <div className="glass-card p-4 text-white">
            <h3 className="font-semibold text-sm text-gray-300 mb-2 uppercase tracking-wider">Organization</h3>
            <select
                className="input py-2"
                value={currentOrganizationId || ''}
                onChange={(event) => onSelect(event.target.value)}
            >
                <option value="" disabled className="bg-surface-800 text-gray-500">
                    Select organization
                </option>
                {organizations.map((org) => (
                    <option key={org._id} value={org._id} className="bg-surface-800 text-white">
                        {org.name}
                    </option>
                ))}
            </select>
        </div>
    )
}

