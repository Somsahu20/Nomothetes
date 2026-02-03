import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { Upload, FileText, X, AlertCircle, CheckCircle } from 'lucide-react';
import { Modal, Button, Input } from '../ui';
import { casesService, CaseUploadResponse } from '../../services/cases';

interface UploadCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (response: CaseUploadResponse) => void;
}

export function UploadCaseModal({ isOpen, onClose, onUploadSuccess }: UploadCaseModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [courtName, setCourtName] = useState('');
  const [caseDate, setCaseDate] = useState('');
  const [documentType, setDocumentType] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  const validateFile = (file: File): string | null => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return 'Only PDF files are allowed';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 50MB';
    }
    return null;
  };

  const handleFileSelect = (selectedFile: File) => {
    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      setFile(null);
    } else {
      setError(null);
      setFile(selectedFile);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const metadata: { court_name?: string; case_date?: string; document_type?: string } = {};
      if (courtName.trim()) metadata.court_name = courtName.trim();
      if (caseDate) metadata.case_date = caseDate;
      if (documentType.trim()) metadata.document_type = documentType.trim();

      const response = await casesService.uploadCase(file, Object.keys(metadata).length > 0 ? metadata : undefined);
      onUploadSuccess(response);
      handleClose();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload file';
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const axiosError = err as { response?: { data?: { detail?: string } } };
        setError(axiosError.response?.data?.detail || errorMessage);
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setError(null);
    setCourtName('');
    setCaseDate('');
    setDocumentType('');
    setIsDragging(false);
    onClose();
  };

  const removeFile = () => {
    setFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Upload Case Document" size="lg">
      <div className="space-y-6">
        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragging
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500'}
            ${file ? 'bg-gray-50 dark:bg-gray-800' : ''}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          {file ? (
            <div className="flex items-center justify-center gap-4">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/50 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900 dark:text-gray-100">{file.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{formatFileSize(file.size)}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile();
                }}
                className="ml-4 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-1">
                <span className="font-medium text-primary-600 dark:text-primary-400">Click to upload</span> or drag and drop
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">PDF files only, up to 50MB</p>
            </>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Optional Metadata */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 dark:text-gray-100">Optional Metadata</h4>

          <div>
            <label htmlFor="courtName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Court Name
            </label>
            <Input
              id="courtName"
              type="text"
              placeholder="e.g., Supreme Court of India"
              value={courtName}
              onChange={(e) => setCourtName(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="caseDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Case Date
            </label>
            <Input
              id="caseDate"
              type="date"
              value={caseDate}
              onChange={(e) => setCaseDate(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="documentType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Document Type
            </label>
            <Input
              id="documentType"
              type="text"
              placeholder="e.g., Judgment, Order, Petition"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!file || isUploading}>
            {isUploading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Uploading...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Upload Case
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
