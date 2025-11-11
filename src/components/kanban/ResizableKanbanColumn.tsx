import { useState, useRef, useEffect } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { LeadCard } from "./LeadCard";
import { Lead } from "@/pages/Board";
import { Card } from "@/components/ui/card";
import { GripVertical, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResizableKanbanColumnProps {
  id: string;
  title: string;
  leads: Lead[];
  onEditLead?: (lead: Lead) => void;
  width: number;
  onWidthChange: (id: string, width: number) => void;
  onMinimize: () => void;
  onMaximize: () => void;
  isMinimized: boolean;
  isMaximized: boolean;
}

const MIN_WIDTH = 250;
const MAX_WIDTH = 600;

export function ResizableKanbanColumn({
  id,
  title,
  leads,
  onEditLead,
  width,
  onWidthChange,
  onMinimize,
  onMaximize,
  isMinimized,
  isMaximized,
}: ResizableKanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id });
  const [isResizing, setIsResizing] = useState(false);
  const columnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!columnRef.current) return;

      const rect = columnRef.current.getBoundingClientRect();
      const newWidth = e.clientX - rect.left;
      const clampedWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth));
      
      onWidthChange(id, clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, id, onWidthChange]);

  const displayWidth = isMinimized ? 80 : isMaximized ? MAX_WIDTH : width;

  return (
    <div
      ref={columnRef}
      className="flex flex-col relative transition-all duration-200"
      style={{ width: `${displayWidth}px`, minWidth: `${displayWidth}px` }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold text-sm uppercase text-muted-foreground ${isMinimized ? 'truncate' : ''}`}>
            {isMinimized ? title.charAt(0) : title}
          </h3>
          {!isMinimized && (
            <p className="text-xs text-muted-foreground mt-1">{leads.length} leads</p>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={isMinimized ? onMaximize : onMinimize}
            title={isMinimized ? "Expand" : "Minimize"}
          >
            {isMinimized ? (
              <Maximize2 className="h-3 w-3" />
            ) : (
              <Minimize2 className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      <Card
        ref={setNodeRef}
        className="flex-1 p-3 bg-muted/20 min-h-[400px] relative"
      >
        {!isMinimized && (
          <>
            <SortableContext
              items={leads.map((l) => l.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {leads.map((lead) => (
                  <LeadCard key={lead.id} lead={lead} onEdit={onEditLead} />
                ))}
              </div>
            </SortableContext>

            {/* Resize Handle */}
            {!isMaximized && (
              <div
                className="absolute top-0 right-0 h-full w-2 cursor-col-resize hover:bg-primary/20 flex items-center justify-center group"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsResizing(true);
                }}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
          </>
        )}
        
        {isMinimized && (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-xs font-medium text-muted-foreground writing-mode-vertical transform -rotate-180">
              {title}
            </p>
            <p className="text-xs text-muted-foreground mt-2">{leads.length}</p>
          </div>
        )}
      </Card>
    </div>
  );
}
