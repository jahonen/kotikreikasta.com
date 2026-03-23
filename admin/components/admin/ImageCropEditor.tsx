'use client';

import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AspectRatioStep {
  ratio: number;
  label: string;
  description: string;
  key: '16:9' | '4:3' | '1:1' | '3:4' | '9:16';
}

const ASPECT_RATIOS: AspectRatioStep[] = [
  {
    ratio: 16 / 9,
    label: 'Maisema (16:9)',
    description: 'OG-kuvat, Twitter-kortit, hero-osiot',
    key: '16:9',
  },
  {
    ratio: 4 / 3,
    label: 'Vakio (4:3)',
    description: 'Esikatselukortit, perinteiset näytöt',
    key: '4:3',
  },
  {
    ratio: 1,
    label: 'Neliö (1:1)',
    description: 'Instagram, pikkukuvat, ruudukot',
    key: '1:1',
  },
  {
    ratio: 3 / 4,
    label: 'Pysty (3:4)',
    description: 'Mobiili-hero, Pinterest',
    key: '3:4',
  },
  {
    ratio: 9 / 16,
    label: 'Tarina (9:16)',
    description: 'Instagram Stories, TikTok, mobiilinäkymät',
    key: '9:16',
  },
];

interface ImageCropEditorProps {
  open: boolean;
  onClose: () => void;
  onSave: (crops: Record<string, CropArea>) => Promise<void>;
  imageFile: File;
  title?: string;
}

export default function ImageCropEditor({
  open,
  onClose,
  onSave,
  imageFile,
  title = 'Rajaa kuva',
}: ImageCropEditorProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [imageSrc, setImageSrc] = useState<string>('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreas, setCroppedAreas] = useState<Record<string, CropArea>>({});
  const [saving, setSaving] = useState(false);

  // Load image when file changes
  useState(() => {
    if (imageFile && open) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(String(reader.result || ''));
      };
      reader.readAsDataURL(imageFile);
    }
  });

  const onCropComplete = useCallback(
    (_: any, croppedAreaPixels: CropArea) => {
      const currentRatio = ASPECT_RATIOS[currentStep];
      setCroppedAreas((prev) => ({
        ...prev,
        [currentRatio.key]: croppedAreaPixels,
      }));
    },
    [currentStep]
  );

  const handleNext = () => {
    if (currentStep < ASPECT_RATIOS.length - 1) {
      setCurrentStep((s) => s + 1);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(croppedAreas);
      onClose();
    } catch (error) {
      console.error('[IMAGE_CROP_EDITOR] Save failed', error);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    setCroppedAreas({});
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setImageSrc('');
    onClose();
  };

  if (!open) return null;

  const currentRatio = ASPECT_RATIOS[currentStep];
  const isLastStep = currentStep === ASPECT_RATIOS.length - 1;
  const allCropsComplete = Object.keys(croppedAreas).length === ASPECT_RATIOS.length;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: 'var(--background, #fff)',
          color: 'var(--text, #111)',
          borderRadius: '8px',
          maxHeight: '90vh',
          width: '100%',
          maxWidth: 'min(1000px, 90vw)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1rem',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 'clamp(1rem, 4vw, 1.25rem)', fontWeight: 600 }}>
              {title}
            </h2>
            <div style={{ fontSize: 'clamp(0.75rem, 3vw, 0.875rem)', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Vaihe {currentStep + 1} / {ASPECT_RATIOS.length}: {currentRatio.label}
            </div>
          </div>
          <button
            className="btn-primary"
            onClick={handleClose}
            style={{ padding: '0.5rem 1rem', flexShrink: 0 }}
          >
            Sulje
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ padding: '0 1.5rem' }}>
          <div
            style={{
              height: '4px',
              background: '#e5e7eb',
              borderRadius: '2px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                background: 'var(--gold)',
                width: `${((currentStep + 1) / ASPECT_RATIOS.length) * 100}%`,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        {/* Cropper */}
        <div style={{ flex: 1, position: 'relative', background: '#000', minHeight: '300px', height: '50vh' }}>
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={currentRatio.ratio}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          )}
        </div>

        {/* Controls */}
        <div style={{ padding: '1rem', borderTop: '1px solid #e5e7eb' }}>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: 'clamp(0.75rem, 3vw, 0.875rem)', fontWeight: 600, marginBottom: '0.5rem' }}>
              {currentRatio.description}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: 'clamp(0.75rem, 3vw, 0.875rem)', fontWeight: 500, flexShrink: 0 }}>Zoom</label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                style={{ flex: 1, minWidth: 0 }}
              />
              <span style={{ fontSize: 'clamp(0.75rem, 3vw, 0.875rem)', color: 'var(--text-muted)', minWidth: '3rem', textAlign: 'right' }}>
                {Math.round(zoom * 100)}%
              </span>
            </div>
          </div>

          {/* Navigation buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              className="btn-primary"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              style={{ padding: '0.75rem 1rem', fontSize: 'clamp(0.875rem, 3vw, 1rem)' }}
            >
              Edellinen
            </button>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {!isLastStep ? (
                <button
                  className="btn-primary"
                  onClick={handleNext}
                  style={{ padding: '0.75rem 1rem', fontSize: 'clamp(0.875rem, 3vw, 1rem)' }}
                >
                  Seuraava
                </button>
              ) : (
                <button
                  className="btn-primary"
                  onClick={handleSave}
                  disabled={saving || !allCropsComplete}
                  style={{ padding: '0.75rem 1rem', fontSize: 'clamp(0.875rem, 3vw, 1rem)' }}
                >
                  {saving ? 'Tallennetaan...' : 'Tallenna'}
                </button>
              )}
            </div>
          </div>

          {/* Step indicators */}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'center' }}>
            {ASPECT_RATIOS.map((ratio, index) => (
              <div
                key={ratio.key}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background:
                    index === currentStep
                      ? 'var(--gold)'
                      : croppedAreas[ratio.key]
                      ? '#10b981'
                      : '#e5e7eb',
                  transition: 'background 0.2s ease',
                }}
                title={ratio.label}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
