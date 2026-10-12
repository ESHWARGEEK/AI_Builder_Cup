"use client";

/**
 * PDF Viewer with Document AI bounding-box overlays.
 *
 * Uses react-pdf for rendering and draws bounding box overlays
 * for each extracted entity on the corresponding page.
 * Clicking an overlay highlights the entity in the right panel.
 */

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Document, Page, pdfjs } from "react-pdf";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Layers,
  Eye,
  EyeOff,
  Maximize2,
  FileText,
  Info,
} from "lucide-react";
import { useEKAStore } from "@/store/eka-store";
import type { ExtractedEntity, BoundingBox } from "@/lib/api-client";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const FIELD_COLORS: Record<string, string> = {
  invoice_number: "#60a5fa",      // blue
  vendor_name: "#34d399",          // emerald
  vendor_id: "#34d399",
  total_amount_usd: "#f59e0b",     // amber
  net_amount_usd: "#f59e0b",
  tax_amount_usd: "#f59e0b",
  invoice_date: "#a78bfa",         // purple
  due_date: "#a78bfa",
  purchase_order_number: "#fb923c", // orange
  default: "#6366f1",              // indigo
};

function getEntityColor(fieldName: string): string {
  return FIELD_COLORS[fieldName] || FIELD_COLORS.default;
}

function BoundingBoxOverlay({
  entity,
  pageWidth,
  pageHeight,
  isSelected,
  onClick,
}: {
  entity: ExtractedEntity;
  pageWidth: number;
  pageHeight: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const { bounding_box: bb } = entity;
  if (!bb) return null;

  const color = getEntityColor(entity.field_name);
  const left = bb.x * pageWidth;
  const top = bb.y * pageHeight;
  const width = bb.width * pageWidth;
  const height = bb.height * pageHeight;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClick}
      title={`${entity.field_name}: ${entity.normalized_value} (${Math.round(entity.confidence * 100)}%)`}
      style={{
        position: "absolute",
        left,
        top,
        width,
        height,
        border: `2px solid ${color}`,
        backgroundColor: isSelected ? `${color}33` : `${color}18`,
        borderRadius: 2,
        cursor: "pointer",
        transition: "all 0.15s ease",
        zIndex: isSelected ? 10 : 5,
        boxShadow: isSelected ? `0 0 8px ${color}66` : "none",
      }}
    >
      {/* Entity label tooltip on hover */}
      {isSelected && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 4px)",
            left: 0,
            backgroundColor: "#0f172a",
            border: `1px solid ${color}`,
            borderRadius: 6,
            padding: "4px 8px",
            fontSize: 11,
            color: color,
            whiteSpace: "nowrap",
            zIndex: 20,
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          }}
        >
          <div style={{ fontWeight: 600 }}>{entity.field_name.replace(/_/g, " ")}</div>
          <div style={{ color: "#94a3b8", fontSize: 10 }}>{entity.normalized_value}</div>
        </div>
      )}
    </motion.div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center border border-border">
        <FileText className="w-8 h-8 text-muted-foreground" />
      </div>
      <div>
        <h3 className="font-semibold text-foreground mb-1">No document loaded</h3>
        <p className="text-sm text-muted-foreground">
          Upload an invoice in the Invoice panel to view it here with bounding-box entity overlays.
        </p>
      </div>
    </div>
  );
}

export function PDFViewer() {
  const {
    pdfFile,
    currentPage,
    setCurrentPage,
    totalPages,
    setTotalPages,
    selectedEntity,
    setSelectedEntity,
    showOverlays,
    setShowOverlays,
    zoomLevel,
    setZoomLevel,
    currentInvoiceResult,
  } = useEKAStore();

  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const onDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setTotalPages(numPages);
      setCurrentPage(1);
    },
    [setTotalPages, setCurrentPage]
  );

  const onPageLoadSuccess = useCallback((page: { width: number; height: number }) => {
    setPageSize({ width: page.width, height: page.height });
  }, []);

  // Get entities for the current page
  const currentPageEntities: ExtractedEntity[] = currentInvoiceResult
    ? Object.values(currentInvoiceResult.extraction.all_entities).filter(
        (entity) => entity.bounding_box?.page === currentPage && entity.bounding_box
      )
    : [];

  const pdfUrl = pdfFile ? URL.createObjectURL(pdfFile) : null;

  const renderWidth = Math.round(pageSize.width * zoomLevel) || 600;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-1 glass rounded-lg px-2 py-1.5">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="p-1 hover:bg-secondary rounded transition-colors disabled:opacity-30"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-mono px-2 text-foreground">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            className="p-1 hover:bg-secondary rounded transition-colors disabled:opacity-30"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1 glass rounded-lg px-2 py-1.5">
          <button
            onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))}
            className="p-1 hover:bg-secondary rounded transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-mono px-1 text-foreground w-12 text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => setZoomLevel(Math.min(3, zoomLevel + 0.1))}
            className="p-1 hover:bg-secondary rounded transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1" />

        {/* Entity count badge */}
        {currentPageEntities.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-primary glass rounded-full px-2.5 py-1 border border-primary/20">
            <Layers className="w-3 h-3" />
            {currentPageEntities.length} entities
          </div>
        )}

        {/* Toggle overlays */}
        <button
          onClick={() => setShowOverlays(!showOverlays)}
          className={`flex items-center gap-1.5 text-xs glass rounded-lg px-3 py-1.5 transition-colors border ${
            showOverlays ? "border-primary/30 text-primary" : "border-border text-muted-foreground"
          }`}
        >
          {showOverlays ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          Overlays
        </button>
      </div>

      {/* PDF canvas area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-[hsl(222,47%,7%)] flex items-start justify-center"
      >
        {!pdfFile ? (
          <EmptyState />
        ) : (
          <div className="py-6">
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="flex items-center justify-center w-[600px] h-[800px]">
                  <div className="text-muted-foreground text-sm animate-pulse">Loading PDF…</div>
                </div>
              }
              error={
                <div className="text-red-400 text-sm text-center py-8">Failed to load PDF</div>
              }
            >
              <div
                className="relative shadow-2xl"
                style={{ width: renderWidth }}
              >
                <Page
                  pageNumber={currentPage}
                  width={renderWidth}
                  onLoadSuccess={onPageLoadSuccess}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                />

                {/* Bounding box overlays */}
                <AnimatePresence>
                  {showOverlays &&
                    currentPageEntities.map((entity) => (
                      <BoundingBoxOverlay
                        key={entity.field_name}
                        entity={entity}
                        pageWidth={renderWidth}
                        pageHeight={(pageSize.height / pageSize.width) * renderWidth}
                        isSelected={selectedEntity === entity.field_name}
                        onClick={() =>
                          setSelectedEntity(
                            selectedEntity === entity.field_name ? null : entity.field_name
                          )
                        }
                      />
                    ))}
                </AnimatePresence>
              </div>
            </Document>
          </div>
        )}
      </div>

      {/* Entity legend */}
      {currentPageEntities.length > 0 && showOverlays && (
        <div className="px-4 py-2 border-t border-border/50 flex flex-wrap gap-2 shrink-0">
          {currentPageEntities.slice(0, 6).map((entity) => (
            <button
              key={entity.field_name}
              onClick={() =>
                setSelectedEntity(
                  selectedEntity === entity.field_name ? null : entity.field_name
                )
              }
              className={`flex items-center gap-1.5 text-[10px] rounded-full px-2.5 py-1 border transition-all ${
                selectedEntity === entity.field_name
                  ? "bg-primary/20 border-primary/40 text-primary"
                  : "glass border-border/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: getEntityColor(entity.field_name) }}
              />
              {entity.field_name.replace(/_/g, " ")}
            </button>
          ))}
          {currentPageEntities.length > 6 && (
            <span className="text-[10px] text-muted-foreground self-center">
              +{currentPageEntities.length - 6} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}
