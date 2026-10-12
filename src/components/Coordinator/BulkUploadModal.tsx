import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Download,
  Upload,
  AlertCircle,
  CheckCircle,
  Users,
  X,
  Loader2,
  FileCheck2,
  Info,
} from 'lucide-react';
import { addBatchSubjects } from '../../services/dataService';
import { EvaluatedSubject } from '../../types';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  companyName: string;
  onSuccess: (addedSubjects: EvaluatedSubject[]) => void;
}

interface ParsedRow {
  name: string;
  role: string;
  department: string;
  email: string;
  targetEvaluators: number;
  rowNumber: number;
}

export function BulkUploadModal({
  isOpen,
  onClose,
  campaignId,
  companyName,
  onSuccess,
}: BulkUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Paso 1: Generar y descargar la plantilla oficial en formato .xlsx
  const handleDownloadTemplate = () => {
    // Encabezados exactos según requerimiento
    const headers = [
      'Nombre Completo',
      'Cargo o Puesto',
      'Departamento o Área',
      'Correo Electrónico (Opcional)',
      'Meta de Evaluadores',
    ];

    // Dos filas de ejemplo realistas
    const sampleRows = [
      [
        'Ana Sofía Mendoza',
        'Directora de Operaciones',
        'Operaciones & Logística',
        'ana.mendoza@empresa.com',
        6,
      ],
      [
        'Carlos Eduardo Ramos',
        'Líder de Desarrollo Web',
        'Tecnología e Innovación',
        'carlos.ramos@empresa.com',
        5,
      ],
    ];

    const worksheetData = [headers, ...sampleRows];
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);

    // Ajustar ancho de columnas para excelente presentación ejecutiva
    ws['!cols'] = [
      { wch: 28 }, // Nombre Completo
      { wch: 26 }, // Cargo o Puesto
      { wch: 26 }, // Departamento o Área
      { wch: 32 }, // Correo Electrónico
      { wch: 20 }, // Meta de Evaluadores
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Colaboradores');

    // Escribir y disparar descarga
    const fileName = `Plantilla_Carga_Colaboradores_360.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Función para procesar el archivo seleccionado
  const processFile = async (selectedFile: File) => {
    if (!selectedFile) return;

    // Validación básica de extensión
    const validExtensions = ['.xlsx', '.xls'];
    const isExcel = validExtensions.some((ext) =>
      selectedFile.name.toLowerCase().endsWith(ext)
    );

    if (!isExcel) {
      setErrors([
        'El archivo debe ser un libro de Excel válido (.xlsx o .xls). Por favor descarga la plantilla oficial.',
      ]);
      setFile(null);
      setParsedData([]);
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);
    setErrors([]);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      if (!worksheet) {
        setErrors(['La hoja de cálculo está vacía o no contiene datos legibles.']);
        setIsProcessing(false);
        return;
      }

      // Convertir a matriz bidimensional de celdas
      const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
        blankrows: false,
      });

      if (!rawRows || rawRows.length === 0) {
        setErrors(['El archivo no contiene filas con datos.']);
        setIsProcessing(false);
        return;
      }

      // Mapear encabezados para tolerar variaciones menores de mayúsculas/acentos
      const headerRow = rawRows[0].map((h) => String(h || '').trim().toLowerCase());

      const findColIndex = (keywords: string[]) => {
        return headerRow.findIndex((colName) =>
          keywords.some((kw) => colName.includes(kw))
        );
      };

      const nameIdx = findColIndex(['nombre', 'completo', 'colaborador']);
      const roleIdx = findColIndex(['cargo', 'puesto', 'rol', 'posicion']);
      const deptIdx = findColIndex(['departamento', 'area', 'área']);
      const emailIdx = findColIndex(['correo', 'email', 'electronico', 'electrónico']);
      const metaIdx = findColIndex(['meta', 'evaluadores', 'cantidad', 'meta de']);

      // Si no encuentra por nombre, asumir orden por defecto de columnas de la plantilla
      const effectiveNameIdx = nameIdx !== -1 ? nameIdx : 0;
      const effectiveRoleIdx = roleIdx !== -1 ? roleIdx : 1;
      const effectiveDeptIdx = deptIdx !== -1 ? deptIdx : 2;
      const effectiveEmailIdx = emailIdx !== -1 ? emailIdx : 3;
      const effectiveMetaIdx = metaIdx !== -1 ? metaIdx : 4;

      const detectedList: ParsedRow[] = [];
      const errorList: string[] = [];

      // Procesar filas a partir de la fila 2 (índice 1)
      for (let i = 1; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!row || row.length === 0) continue;

        const rowNumber = i + 1;
        const rawName = String(row[effectiveNameIdx] || '').trim();
        const rawRole = String(row[effectiveRoleIdx] || '').trim();
        const rawDept = String(row[effectiveDeptIdx] || '').trim();
        const rawEmail = String(row[effectiveEmailIdx] || '').trim();
        const rawMeta = row[effectiveMetaIdx];

        // Verificar si la fila está completamente vacía
        const isCompletelyEmpty =
          !rawName && !rawRole && !rawDept && !rawEmail && (!rawMeta || rawMeta === '');
        if (isCompletelyEmpty) continue;

        // Validar que al menos el campo "Nombre Completo" no venga vacío
        if (!rawName) {
          errorList.push(`Fila ${rowNumber}: Falta el "Nombre Completo" del colaborador.`);
          continue;
        }

        // Meta de evaluadores: número válido entre 1 y 30 (default 5)
        let parsedMeta = 5;
        if (rawMeta !== undefined && rawMeta !== '') {
          const num = Number(rawMeta);
          if (!isNaN(num) && num > 0) {
            parsedMeta = Math.min(Math.max(Math.round(num), 1), 30);
          }
        }

        detectedList.push({
          name: rawName,
          role: rawRole || 'Colaborador',
          department: rawDept || 'General',
          email: rawEmail,
          targetEvaluators: parsedMeta,
          rowNumber,
        });
      }

      if (detectedList.length === 0 && errorList.length === 0) {
        errorList.push('No se encontraron filas con datos de colaboradores en la plantilla.');
      }

      setParsedData(detectedList);
      setErrors(errorList);
    } catch (err: any) {
      console.error('Error procesando archivo Excel:', err);
      setErrors([
        'Error al interpretar el archivo Excel. Asegúrate de que no esté protegido por contraseña o dañado.',
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      processFile(selected);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const selected = e.dataTransfer.files?.[0];
    if (selected) {
      processFile(selected);
    }
  };

  // Paso 3: Guardar en Firestore mediante writeBatch y refrescar
  const handleConfirmImport = async () => {
    if (parsedData.length === 0) return;
    setIsSaving(true);
    try {
      const added = await addBatchSubjects(
        campaignId,
        parsedData.map((p) => ({
          name: p.name,
          role: p.role,
          department: p.department,
          email: p.email,
          targetEvaluators: p.targetEvaluators,
        }))
      );

      onSuccess(added);
      handleClose();
    } catch (err: any) {
      console.error('Error al importar colaboradores:', err);
      setErrors([
        'Ocurrió un error al guardar los colaboradores en la base de datos. Por favor reintenta.',
      ]);
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedData([]);
    setErrors([]);
    setIsProcessing(false);
    setIsSaving(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
        {/* Cabecera del Modal */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-lime-100 text-lime-800 flex items-center justify-center border border-lime-200/80 shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Carga Masiva de Colaboradores (.xlsx)
              </h3>
              <p className="text-xs text-slate-500">
                {companyName ? `Empresa: ${companyName}` : 'Importación rápida por lote'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido en 2 Pasos */}
        <div className="p-6 space-y-6">
          {/* PASO 1: Descargar Formato */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                    1
                  </span>
                  <h4 className="text-sm font-bold text-slate-900">
                    Descargar Plantilla Oficial
                  </h4>
                </div>
                <p className="text-xs text-slate-500 mt-1 pl-8">
                  Incluye las 5 columnas requeridas y dos filas de ejemplo para asegurar una importación limpia.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="shrink-0 px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 font-semibold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Download className="w-4 h-4 text-lime-600" />
                <span>Descargar Plantilla Excel</span>
              </button>
            </div>

            {/* Micro guía de columnas */}
            <div className="mt-3 pt-3 border-t border-slate-200/60 text-[11px] text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1 pl-8">
              <span className="font-semibold text-slate-700">Columnas:</span>
              <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-mono text-[10px]">
                Nombre Completo *
              </span>
              <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-mono text-[10px]">
                Cargo o Puesto
              </span>
              <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-mono text-[10px]">
                Departamento o Área
              </span>
              <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-mono text-[10px]">
                Correo (Opcional)
              </span>
              <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-mono text-[10px]">
                Meta de Evaluadores
              </span>
            </div>
          </div>

          {/* PASO 2: Subir Archivo */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                2
              </span>
              <h4 className="text-sm font-bold text-slate-900">
                Subir Archivo Excel Completado
              </h4>
            </div>

            {/* Zona de Drop / Selector */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition flex flex-col items-center justify-center gap-2.5 ${
                isDragOver
                  ? 'border-lime-500 bg-lime-50/50'
                  : file
                  ? 'border-lime-300 bg-lime-50/20'
                  : 'border-slate-300 hover:border-slate-400 bg-slate-50/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-xs">
                {isProcessing ? (
                  <Loader2 className="w-6 h-6 animate-spin text-lime-600" />
                ) : file ? (
                  <FileCheck2 className="w-6 h-6 text-lime-600" />
                ) : (
                  <Upload className="w-6 h-6 text-slate-500" />
                )}
              </div>

              <div>
                {file ? (
                  <>
                    <p className="text-sm font-bold text-slate-900">{file.name}</p>
                    <p className="text-xs text-slate-500">
                      {(file.size / 1024).toFixed(1)} KB · Haz clic para cambiar de archivo
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-slate-800">
                      Arrastra tu archivo aquí o haz clic para seleccionarlo
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Archivos soportados: .xlsx o .xls
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Estado de Detección / Contador */}
          {parsedData.length > 0 && (
            <div className="p-4 bg-lime-50 border border-lime-200 rounded-2xl flex items-center justify-between gap-3 text-lime-900">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-lime-200/80 flex items-center justify-center text-lime-900 shrink-0">
                  <CheckCircle className="w-5 h-5 text-lime-800" />
                </div>
                <div>
                  <p className="text-sm font-bold text-lime-950">
                    Se detectaron {parsedData.length} colaboradores listos para importar
                  </p>
                  <p className="text-xs text-lime-800/80">
                    Todos cuentan con su nombre completo y parámetros listos para evaluación 360°.
                  </p>
                </div>
              </div>

              <span className="px-3 py-1 bg-lime-200/90 text-lime-900 text-xs font-mono font-bold rounded-lg shrink-0">
                {parsedData.length} en cola
              </span>
            </div>
          )}

          {/* Vista Previa de Colaboradores Detectados (Primeros 3) */}
          {parsedData.length > 0 && (
            <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
              <div className="bg-slate-50 px-3 py-2 font-semibold text-slate-600 flex justify-between">
                <span>Muestra de registros listos:</span>
                <span className="text-[11px] text-slate-400">
                  Mostrando {Math.min(parsedData.length, 5)} de {parsedData.length}
                </span>
              </div>
              {parsedData.slice(0, 5).map((item, idx) => (
                <div key={idx} className="px-3 py-2 flex items-center justify-between gap-2">
                  <div className="truncate">
                    <strong className="text-slate-900 font-semibold">{item.name}</strong>
                    <span className="text-slate-500 ml-2">
                      · {item.role} ({item.department})
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-mono shrink-0">
                    Meta: {item.targetEvaluators}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Errores o Advertencias detectadas en filas */}
          {errors.length > 0 && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-rose-800">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>Observaciones encontradas en el archivo:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-rose-700 max-h-32 overflow-y-auto pl-1">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Pie del Modal con Acciones */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={parsedData.length === 0 || isSaving || isProcessing}
            className="bg-slate-900 hover:bg-black disabled:opacity-40 disabled:hover:bg-slate-900 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm flex items-center gap-2 transition cursor-pointer disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Guardando en Firebase...</span>
              </>
            ) : (
              <>
                <Users className="w-4 h-4 text-lime-400" />
                <span>
                  Confirmar e Importar ({parsedData.length} Colaborador{parsedData.length === 1 ? '' : 'es'})
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
