import { IconX } from '../../../components/common/Icons'
import { FileUploader } from '../../file/components/FileUploader'

export interface FilesPanelProps {
    token: string
    meetingId: string
    onClose: () => void
}

export function FilesPanel({ token, meetingId, onClose }: FilesPanelProps) {
    return (
        <div className="side-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '100%', minHeight: 0 } as React.CSSProperties}>
            <div className="side-panel-header" style={{ flexShrink: 0 }}>
                <span className="side-panel-title">Shared Files</span>
                <button className="btn-icon" onClick={onClose} aria-label="Close panel" style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.06)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconX />
                </button>
            </div>
            <div className="side-panel-body" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px' }}>
                <FileUploader token={token} contextType="meetingChat" contextId={meetingId} />
            </div>
        </div>
    )
}
