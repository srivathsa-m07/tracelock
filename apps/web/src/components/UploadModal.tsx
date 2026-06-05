import React, { useCallback, useRef, useState } from 'react';
import api from '../services/api';
import './upload-modal.css';

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

interface UploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function UploadModal({ onClose, onSuccess }: UploadModalProps) {
  const [state, setState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [fileName, setFileName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(async (fileList: FileList | File[]) => {
    const files = Array.from(fileList as any as File[]);
    const valid = files.some((f) => f.name.endsWith('.json')) || files.some((f) => f.name.endsWith('.lock') || f.name.includes('package-lock') || f.name.includes('yarn.lock') || f.name.includes('pnpm-lock'));
    if (!valid) {
      setErrorMsg('Please upload a package.json or lockfile (package-lock.json, yarn.lock, pnpm-lock.yaml).');
      setState('error');
      return;
    }
    setFileName(files.map((f) => f.name).join(', '));
    setState('uploading');
    setProgress(0);
    try {
      // If only package.json present, call package-json endpoint; otherwise send lockfiles too
      const hasPackageJson = files.some((f) => f.name.endsWith('.json'));
      if (files.length === 1 && hasPackageJson) {
        await api.uploadPackageJson(files[0], setProgress);
      } else {
        await api.uploadLockfiles(files, setProgress);
      }
      setState('success');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Upload failed. Please try again.';
      setErrorMsg(msg);
      setState('error');
    }
  }, [onSuccess, onClose]);


  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length) upload(files);
  }, [upload]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length) upload(files);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Upload package.json">
        <div className="modal-header">
          <div>
            <p className="modal-eyebrow">Dependency scan</p>
            <h2 className="modal-title">Upload package.json</h2>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {state === 'idle' && (
          <div
            className={`drop-zone${dragOver ? ' drop-zone-active' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          >
            <div className="drop-icon">↑</div>
            <p className="drop-primary">Drag & drop your package.json here</p>
            <p className="drop-secondary">or click to browse files</p>
            <input ref={inputRef} type="file" accept=".json,application/json" onChange={handleFile} hidden />
          </div>
        )}

        {state === 'uploading' && (
          <div className="upload-progress-area">
            <p className="upload-filename">{fileName}</p>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <p className="progress-label">Analysing dependencies… {progress}%</p>
          </div>
        )}

        {state === 'success' && (
          <div className="upload-result upload-success">
            <div className="result-icon">✓</div>
            <p className="result-title">Scan complete</p>
            <p className="result-sub">Dashboard is refreshing with new risk data.</p>
          </div>
        )}

        {state === 'error' && (
          <div className="upload-result upload-error">
            <div className="result-icon">✕</div>
            <p className="result-title">Upload failed</p>
            <p className="result-sub">{errorMsg}</p>
            <button className="button button-secondary retry-btn" onClick={() => { setState('idle'); setErrorMsg(''); }}>
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
