import { X } from '@phosphor-icons/react';
import type { GradeRecord } from '../../types';
import { getGradeScoreColor } from '../../utils/gradeUtils';

interface EditGradeModalProps {
  selectedGrade: GradeRecord;
  editGradeVal: string;
  setEditGradeVal: (v: string) => void;
  editLetterGradeVal: string;
  setEditLetterGradeVal: (v: string) => void;
  isSubmitting: boolean;
  handleUpdateGrade: (e: React.FormEvent) => void;
  setShowEditModal: (show: boolean) => void;
}

export default function EditGradeModal({
  selectedGrade,
  editGradeVal,
  setEditGradeVal,
  editLetterGradeVal,
  setEditLetterGradeVal,
  isSubmitting,
  handleUpdateGrade,
  setShowEditModal,
}: EditGradeModalProps) {
  return (
    <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h2>Secure Grade Update</h2>
          <button className="icon-btn" onClick={() => setShowEditModal(false)}><X size={20} /></button>
        </div>
        <form onSubmit={handleUpdateGrade}>
          <div className="modal-body">
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              Updating grade for Student <strong>{selectedGrade.studentId}</strong> in <strong>{selectedGrade.courseCode}</strong>.
              All changes will trigger a signature rebuild and write to the audit trail.
            </div>
            
            <div className="form-group">
              <label htmlFor="editGrade">New Numeric Grade</label>
              <input
                id="editGrade"
                type="number"
                step="0.1"
                min="0"
                max="100"
                className="form-control"
                style={{ paddingLeft: '14px' }}
                value={editGradeVal}
                onChange={e => {
                  setEditGradeVal(e.target.value);
                  const num = parseFloat(e.target.value);
                  if (!isNaN(num)) {
                    if (num >= 90) setEditLetterGradeVal('A');
                    else if (num >= 80) setEditLetterGradeVal('B');
                    else if (num >= 70) setEditLetterGradeVal('C');
                    else if (num >= 60) setEditLetterGradeVal('D');
                    else setEditLetterGradeVal('F');
                  }
                }}
                required
              />
            </div>

            <div className="form-group">
              <label>New Letter Grade</label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '42px',
                backgroundColor: `${getGradeScoreColor(parseFloat(editGradeVal) || 0)}15`,
                color: getGradeScoreColor(parseFloat(editGradeVal) || 0),
                border: `1.5px solid ${getGradeScoreColor(parseFloat(editGradeVal) || 0)}`,
                borderRadius: 'var(--radius-sm)',
                fontWeight: 800,
                fontSize: '18px',
                transition: 'all 0.2s ease'
              }}>
                {editLetterGradeVal}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="nav-btn" style={{ width: 'auto', border: '1px solid var(--border)' }} onClick={() => setShowEditModal(false)}>
              Cancel
            </button>
            <button type="submit" className="action-btn" disabled={isSubmitting}>
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
