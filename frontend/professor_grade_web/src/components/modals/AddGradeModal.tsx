import { useState } from 'react';
import { X, Plus, Trash, UploadSimple } from '@phosphor-icons/react';
import type { CourseModel } from '../../types';
import type { WebBatchEntry } from '../../types';
import { ApiService } from '../../services/api';
import { getGradeScoreColor, getLetterGrade } from '../../utils/gradeUtils';

interface AddGradeModalProps {
  api: ApiService;
  addModalType: 'single' | 'batch';
  setAddModalType: (type: 'single' | 'batch') => void;
  setShowAddModal: (show: boolean) => void;
  isSubmitting: boolean;
  activeCourses: CourseModel[];
  // Single entry state
  newStudentId: string;
  setNewStudentId: (v: string) => void;
  newCourseCode: string;
  setNewCourseCode: (v: string) => void;
  newCourseName: string;
  setNewCourseName: (v: string) => void;
  newGrade: string;
  setNewGrade: (v: string) => void;
  newLetterGrade: string;
  selectedCourseCode: string;
  setSelectedCourseCode: (v: string) => void;
  showNewCourseFields: boolean;
  setShowNewCourseFields: (v: boolean) => void;
  handleSingleSubmit: (e: React.FormEvent) => void;
  // Batch entry state
  webBatchCourseCode: string;
  setWebBatchCourseCode: (v: string) => void;
  webBatchEntries: WebBatchEntry[];
  setWebBatchEntries: (entries: WebBatchEntry[]) => void;
  handleBatchSubmit: (e: React.FormEvent) => void;
  handleWebBatchGradeChange: (index: number, gradeVal: string) => void;
  addWebBatchRow: () => void;
  removeWebBatchRow: (index: number) => void;
}

export default function AddGradeModal({
  api,
  addModalType,
  setAddModalType,
  setShowAddModal,
  isSubmitting,
  activeCourses,
  newStudentId,
  setNewStudentId,
  newCourseCode,
  setNewCourseCode,
  newCourseName,
  setNewCourseName,
  newGrade,
  setNewGrade,
  newLetterGrade,
  selectedCourseCode,
  setSelectedCourseCode,
  showNewCourseFields,
  setShowNewCourseFields,
  handleSingleSubmit,
  webBatchCourseCode,
  setWebBatchCourseCode,
  webBatchEntries,
  setWebBatchEntries,
  handleBatchSubmit,
  handleWebBatchGradeChange,
  addWebBatchRow,
  removeWebBatchRow,
}: AddGradeModalProps) {
  const [isFileParsing, setIsFileParsing] = useState(false);

  const parseSheetData = (rows: any[][]) => {
    if (!rows || rows.length === 0) return { error: 'Sheet is empty' };

    const normalize = (str: any) => {
      if (str === undefined || str === null) return '';
      return str.toString().trim().toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[أإآا]/g, 'ا')
        .replace(/[ىي]/g, 'ي')
        .replace(/[ةه]/g, 'ه');
    };

    const SEAT_NO_SYNONYMS = ['رقمالجلوس', 'seatnumber', 'seatno', 'studentid', 'student_id', 'رقمجلوس'];
    const GRADE_SYNONYMS = ['الكلي', 'الكلى', 'المجموع', 'الدرجه', 'الدرجة', 'total', 'grade', 'score', 'totalgrade', 'final'];
    const COURSE_SYNONYMS = ['اسمالمقرر', 'المقرر', 'course', 'coursename', 'subject'];

    let seatColIdx = -1;
    let gradeColIdx = -1;
    let courseColIdx = -1;
    let headerRowIdx = -1;

    for (let r = 0; r < Math.min(rows.length, 10); r++) {
      const row = rows[r];
      if (!Array.isArray(row)) continue;
      
      for (let c = 0; c < row.length; c++) {
        const val = normalize(row[c]);
        if (SEAT_NO_SYNONYMS.includes(val)) seatColIdx = c;
        if (GRADE_SYNONYMS.includes(val)) gradeColIdx = c;
        if (COURSE_SYNONYMS.includes(val)) courseColIdx = c;
      }
      
      if (seatColIdx !== -1 && gradeColIdx !== -1) {
        headerRowIdx = r;
        break;
      }
    }

    if (seatColIdx === -1 || gradeColIdx === -1) {
      return { error: 'Could not locate required columns: "رقم الجلوس" (Seat Number) and "الكلي" (Total Grade) in the sheet.' };
    }

    let courseName = '';
    if (courseColIdx !== -1) {
      // scanned below
    } else {
      for (let r = 0; r < Math.min(rows.length, 10); r++) {
        const row = rows[r];
        if (!Array.isArray(row)) continue;
        for (let c = 0; c < row.length; c++) {
          const val = row[c] ? row[c].toString() : '';
          if (val.includes('اسم المقرر') || val.includes('المقرر') || val.toLowerCase().includes('course')) {
            const parts = val.split(/[:：]/);
            if (parts.length > 1 && parts[1].trim()) {
              courseName = parts[1].trim();
            } else if (c + 1 < row.length && row[c + 1]) {
              courseName = row[c + 1].toString().trim();
            }
            break;
          }
        }
        if (courseName) break;
      }
    }

    const students = [];
    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;

      const rawSeat = row[seatColIdx];
      const rawGrade = row[gradeColIdx];
      
      if (rawSeat === undefined || rawSeat === null || rawSeat === '') continue;

      const student_id = rawSeat.toString().trim();
      if (!student_id || student_id.toLowerCase() === 'null') continue;

      const grade = parseFloat(rawGrade);
      if (isNaN(grade)) continue;

      if (courseColIdx !== -1 && row[courseColIdx]) {
        courseName = row[courseColIdx].toString().trim();
      }

      students.push({
        student_id,
        grade
      });
    }

    return { courseName, students };
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (fileExt === 'pdf') {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        if (!dataUrl) return;
        const base64Data = dataUrl.split(',')[1];

        setIsFileParsing(true);
        try {
          const result = await api.parsePdf(base64Data);
          if (result.students && result.students.length > 0) {
            const newEntries = result.students.map(s => ({
              studentId: s.student_id,
              grade: s.grade.toString(),
              letterGrade: getLetterGrade(s.grade)
            }));
            setWebBatchEntries(newEntries);

            if (result.course_name) {
              const matched = activeCourses.find(c => 
                c.course_name.toLowerCase().includes(result.course_name!.toLowerCase()) ||
                result.course_name!.toLowerCase().includes(c.course_name.toLowerCase())
              );
              if (matched) {
                setWebBatchCourseCode(matched.course_code);
                setShowNewCourseFields(false);
              } else {
                setWebBatchCourseCode('NEW_COURSE');
                setNewCourseCode('');
                setNewCourseName(result.course_name);
                setShowNewCourseFields(true);
              }
            }
            alert(`Successfully loaded ${result.students.length} student records from PDF!`);
          } else {
            alert('No student records found in the PDF. Please ensure the PDF is in the correct format.');
          }
        } catch (error) {
          console.error(error);
          alert('Failed to parse PDF: ' + (error instanceof Error ? error.message : String(error)));
        } finally {
          setIsFileParsing(false);
        }
      };
      reader.readAsDataURL(file);
    } else if (fileExt === 'xlsx' || fileExt === 'xls' || fileExt === 'csv') {
      setIsFileParsing(true);
      try {
        if (!(window as any).XLSX) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load SheetJS library.'));
            document.head.appendChild(script);
          });
        }
        
        const XLSX = (window as any).XLSX;
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const arrayBuffer = event.target?.result as ArrayBuffer;
            const data = new Uint8Array(arrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

            const parsed = parseSheetData(rows);
            if (parsed.error) {
              alert(parsed.error);
              return;
            }

            if (parsed.students && parsed.students.length > 0) {
              const newEntries = parsed.students.map(s => ({
                studentId: s.student_id,
                grade: s.grade.toString(),
                letterGrade: getLetterGrade(s.grade)
              }));
              setWebBatchEntries(newEntries);

              if (parsed.courseName) {
                const matched = activeCourses.find(c => 
                  c.course_name.toLowerCase().includes(parsed.courseName!.toLowerCase()) ||
                  parsed.courseName!.toLowerCase().includes(c.course_name.toLowerCase())
                );
                if (matched) {
                  setWebBatchCourseCode(matched.course_code);
                  setShowNewCourseFields(false);
                } else {
                  setWebBatchCourseCode('NEW_COURSE');
                  setNewCourseCode('');
                  setNewCourseName(parsed.courseName);
                  setShowNewCourseFields(true);
                }
              }
              alert(`Successfully loaded ${parsed.students.length} student records from spreadsheet!`);
            } else {
              alert('No valid student rows found in the sheet.');
            }
          } catch (err) {
            alert('Failed to parse sheet data: ' + (err instanceof Error ? err.message : String(err)));
          } finally {
            setIsFileParsing(false);
          }
        };
        reader.readAsArrayBuffer(file);
      } catch (err) {
        alert('Failed to load parser: ' + (err instanceof Error ? err.message : String(err)));
        setIsFileParsing(false);
      }
    } else {
      alert('Unsupported file type. Please upload a PDF, CSV, or XLSX file.');
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="segmented-control" style={{ marginBottom: 0 }}>
            <button
              className={addModalType === 'single' ? 'active' : ''}
              onClick={() => setAddModalType('single')}
            >
              Single Entry
            </button>
            <button
              className={addModalType === 'batch' ? 'active' : ''}
              onClick={() => setAddModalType('batch')}
            >
              Batch (CSV/Text)
            </button>
          </div>
          <button className="icon-btn" onClick={() => setShowAddModal(false)}><X size={20} /></button>
        </div>

        {addModalType === 'single' ? (
          <form onSubmit={handleSingleSubmit}>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="newStudentId">Student ID</label>
                <input
                  id="newStudentId"
                  type="text"
                  className="form-control"
                  style={{ paddingLeft: '14px' }}
                  placeholder="e.g. 202611002"
                  value={newStudentId}
                  onChange={e => setNewStudentId(e.target.value)}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="courseSelect">Select Course</label>
                <select
                  id="courseSelect"
                  className="select-filter"
                  style={{ width: '100%', padding: '10px' }}
                  value={selectedCourseCode}
                  onChange={e => {
                    const val = e.target.value;
                    setSelectedCourseCode(val);
                    if (val === 'NEW_COURSE') {
                      setNewCourseCode('');
                      setNewCourseName('');
                      setShowNewCourseFields(true);
                    } else {
                      const selected = activeCourses.find(c => c.course_code === val);
                      if (selected) {
                        setNewCourseCode(selected.course_code);
                        setNewCourseName(selected.course_name);
                      }
                      setShowNewCourseFields(false);
                    }
                  }}
                  required
                >
                  {activeCourses.map(c => (
                    <option key={c.course_code} value={c.course_code}>
                      {c.course_code} — {c.course_name}
                    </option>
                  ))}
                  <option value="NEW_COURSE">+ Add New Course...</option>
                </select>
              </div>

              {showNewCourseFields && (
                <div className="form-row" style={{ animation: 'fade-in 0.2s ease' }}>
                  <div className="form-group">
                    <label htmlFor="newCourseCode">New Course Code</label>
                    <input
                      id="newCourseCode"
                      type="text"
                      className="form-control"
                      style={{ paddingLeft: '14px' }}
                      placeholder="e.g. CS101"
                      value={newCourseCode}
                      onChange={e => setNewCourseCode(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="newCourseName">New Course Name</label>
                    <input
                      id="newCourseName"
                      type="text"
                      className="form-control"
                      style={{ paddingLeft: '14px' }}
                      placeholder="e.g. Intro to CS"
                      value={newCourseName}
                      onChange={e => setNewCourseName(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="newGrade">Numeric Grade (0-100)</label>
                  <input
                    id="newGrade"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    className="form-control"
                    style={{ paddingLeft: '14px' }}
                    placeholder="85.5"
                    value={newGrade}
                    onChange={e => setNewGrade(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Letter Grade</label>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '42px',
                    backgroundColor: `${getGradeScoreColor(parseFloat(newGrade) || 0)}15`,
                    color: getGradeScoreColor(parseFloat(newGrade) || 0),
                    border: `1.5px solid ${getGradeScoreColor(parseFloat(newGrade) || 0)}`,
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 800,
                    fontSize: '18px',
                    transition: 'all 0.2s ease'
                  }}>
                    {newLetterGrade}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="nav-btn" style={{ width: 'auto', border: '1px solid var(--border)' }} onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              <button type="submit" className="action-btn" disabled={isSubmitting}>
                Create Record
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleBatchSubmit}>
            <div className="modal-body batch-container">
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label htmlFor="batchCourseSelect">Select Course for Batch</label>
                <select
                  id="batchCourseSelect"
                  className="select-filter"
                  style={{ width: '100%', padding: '10px' }}
                  value={webBatchCourseCode}
                  onChange={e => {
                    const val = e.target.value;
                    setWebBatchCourseCode(val);
                    if (val === 'NEW_COURSE') {
                      setNewCourseCode('');
                      setNewCourseName('');
                      setShowNewCourseFields(true);
                    } else {
                      const selected = activeCourses.find(c => c.course_code === val);
                      if (selected) {
                        setNewCourseCode(selected.course_code);
                        setNewCourseName(selected.course_name);
                      }
                      setShowNewCourseFields(false);
                    }
                  }}
                  required
                >
                  <option value="">-- Select Course --</option>
                  {activeCourses.map(c => (
                    <option key={c.course_code} value={c.course_code}>
                      {c.course_code} — {c.course_name}
                    </option>
                  ))}
                  <option value="NEW_COURSE">+ Add New Course...</option>
                </select>
              </div>

              {showNewCourseFields && (
                <div className="form-row" style={{ animation: 'fade-in 0.2s ease', marginBottom: '16px' }}>
                  <div className="form-group">
                    <label htmlFor="batchNewCourseCode">New Course Code</label>
                    <input
                      id="batchNewCourseCode"
                      type="text"
                      className="form-control"
                      style={{ paddingLeft: '14px' }}
                      placeholder="e.g. CS101"
                      value={newCourseCode}
                      onChange={e => setNewCourseCode(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="batchNewCourseName">New Course Name</label>
                    <input
                      id="batchNewCourseName"
                      type="text"
                      className="form-control"
                      style={{ paddingLeft: '14px' }}
                      placeholder="e.g. Intro to CS"
                      value={newCourseName}
                      onChange={e => setNewCourseName(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              <div style={{ maxHeight: '250px', overflowY: 'auto', paddingRight: '4px', marginBottom: '16px' }}>
                <table className="batch-table">
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Numeric Grade</th>
                      <th>Letter Grade</th>
                      <th style={{ width: '50px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {webBatchEntries.map((entry, idx) => (
                      <tr key={idx}>
                        <td>
                          <input
                            type="text"
                            className="form-control"
                            style={{ padding: '8px 12px', height: '36px' }}
                            placeholder="Student ID"
                            value={entry.studentId}
                            onChange={e => {
                              const val = e.target.value;
                              setWebBatchEntries(webBatchEntries.map((item, i) => i === idx ? { ...item, studentId: val } : item));
                            }}
                            required
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            className="form-control"
                            style={{ padding: '8px 12px', height: '36px' }}
                            placeholder="Grade"
                            value={entry.grade}
                            onChange={e => handleWebBatchGradeChange(idx, e.target.value)}
                            required
                          />
                        </td>
                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                          <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text)' }}>
                            {entry.letterGrade}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                          <button
                            type="button"
                            className="icon-btn"
                            style={{ color: 'var(--destructive)', opacity: webBatchEntries.length <= 1 ? 0.4 : 1 }}
                            disabled={webBatchEntries.length <= 1}
                            onClick={() => removeWebBatchRow(idx)}
                          >
                            <Trash size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '24px' }}>
                <button
                  type="button"
                  className="nav-btn"
                  style={{ width: 'auto', border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={addWebBatchRow}
                >
                  <Plus size={16} /> Add Student Row
                </button>
              </div>

              {/* Spreadsheet Upload Container */}
              <div style={{
                padding: '16px',
                border: '1px dashed var(--border)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--muted)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {isFileParsing ? 'Processing file contents...' : 'Do you have a pre-formatted grades sheet?'}
                </span>
                <label 
                  className="action-btn" 
                  style={{ 
                    fontSize: '11px', 
                    padding: '6px 12px', 
                    cursor: isFileParsing ? 'not-allowed' : 'pointer', 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    opacity: isFileParsing ? 0.6 : 1
                  }}
                >
                  <UploadSimple size={14} />
                  {isFileParsing ? 'Parsing...' : 'Upload File (.csv, .xlsx, .pdf)'}
                  <input
                    type="file"
                    accept=".csv, .xlsx, .pdf"
                    style={{ display: 'none' }}
                    disabled={isFileParsing}
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="nav-btn" style={{ width: 'auto', border: '1px solid var(--border)' }} onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              <button type="submit" className="action-btn" disabled={isSubmitting}>
                Upload &amp; Sign Batch
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
