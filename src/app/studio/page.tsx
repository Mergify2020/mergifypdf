"use client";

import React, { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Page = { id: string; thumb: string };

function SortablePage({ page }: { page: Page }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: page.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: "grab",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="border rounded-xl overflow-hidden shadow-sm bg-white"
    >
      <img
        src={page.thumb}
        alt={`Page preview`}
        className="w-full aspect-[3/4] object-contain"
      />
    </div>
  );
}

export default function StudioPage() {
  const [pages, setPages] = useState<Page[]>([
    { id: "1", thumb: "https://via.placeholder.com/200x260?text=Page+1" },
    { id: "2", thumb: "https://via.placeholder.com/200x260?text=Page+2" },
    { id: "3", thumb: "https://via.placeholder.com/200x260?text=Page+3" },
  ]);

  const sensors = useSensors(useSensor(PointerSensor));

  function handleDragEnd(event: any) {
    const { active, over } = event;
    if (active.id !== over.id) {
      setPages((prev) => {
        const oldIndex = prev.findIndex((p) => p.id === active.id);
        const newIndex = prev.findIndex((p) => p.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-3xl font-semibold mb-4">Studio — Reorder Pages</h1>
      <p className="text-gray-600 mb-6">
        Drag and drop pages below to change their order.
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={pages.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {pages.map((page) => (
              <SortablePage key={page.id} page={page} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </main>
  );
}
