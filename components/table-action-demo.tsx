"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { CopyIcon, EyeIcon, PencilIcon, Trash2Icon } from "lucide-react"

import { TableAction, type TableActions } from "@/components/ui/table-action"

export type User = {
  id: string
  name: string
  email: string
  role: "admin" | "member"
}

const userActions: TableActions<User> = [
  [
    {
      label: "Copy ID",
      icon: <CopyIcon />,
      onSelect: (user) => navigator.clipboard.writeText(user.id),
    },
  ],
  [
    { label: "View", icon: <EyeIcon />, onSelect: (user) => console.log("view", user) },
    {
      label: "Edit",
      icon: <PencilIcon />,
      shortcut: "⌘E",
      disabled: (user) => user.role === "admin",
      onSelect: (user) => console.log("edit", user),
    },
  ],
  [
    {
      label: "Delete",
      icon: <Trash2Icon />,
      variant: "destructive",
      hidden: (user) => user.role === "admin",
      confirm: {
        title: "Delete this user?",
        description: "The user and all of their data will be removed permanently.",
        confirmLabel: "Delete",
      },
      // Returning a Promise keeps the dialog open with a spinner until it settles.
      onSelect: (user) => fetch(`/api/users/${user.id}`, { method: "DELETE" }),
    },
  ],
]

// Use as the last column of a TanStack Table (shadcn data-table pattern).
export const columns: ColumnDef<User>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "email", header: "Email" },
  { accessorKey: "role", header: "Role" },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <TableAction row={row.original} actions={userActions} />
      </div>
    ),
  },
]
