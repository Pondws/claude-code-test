"use client"

import * as React from "react"
import { AlertDialog } from "@base-ui/react/alert-dialog"
import { Menu } from "@base-ui/react/menu"
import { Loader2Icon, MoreHorizontalIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type RowPredicate<TData> = boolean | ((row: TData) => boolean)

export interface TableActionConfirm {
  title?: React.ReactNode
  description?: React.ReactNode
  confirmLabel?: React.ReactNode
  cancelLabel?: React.ReactNode
}

export interface TableActionItem<TData> {
  /** Unique key. Falls back to the label when it's a string. */
  key?: string
  label: React.ReactNode
  icon?: React.ReactNode
  /** Hint text shown on the right side, e.g. "⌘E". */
  shortcut?: React.ReactNode
  variant?: "default" | "destructive"
  disabled?: RowPredicate<TData>
  hidden?: RowPredicate<TData>
  /** Ask before running `onSelect`. `true` uses the default dialog text. */
  confirm?: boolean | TableActionConfirm
  /** Can return a Promise; the confirm dialog stays open with a spinner until it settles. */
  onSelect: (row: TData) => void | Promise<unknown>
}

/** A flat list, or a list of groups. Groups are separated by a divider. */
export type TableActions<TData> =
  | TableActionItem<TData>[]
  | TableActionItem<TData>[][]

export interface TableActionProps<TData> {
  row: TData
  actions: TableActions<TData>
  /** Heading at the top of the menu. Pass `null` to hide it. */
  label?: React.ReactNode
  /** Screen-reader label for the trigger button. */
  triggerLabel?: string
  /** Replace the default "⋯" trigger content. */
  triggerContent?: React.ReactNode
  triggerClassName?: string
  contentClassName?: string
  side?: "top" | "bottom" | "left" | "right"
  align?: "start" | "center" | "end"
  sideOffset?: number
  disabled?: boolean
}

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

function resolve<TData>(value: RowPredicate<TData> | undefined, row: TData) {
  return typeof value === "function" ? value(row) : Boolean(value)
}

function toGroups<TData>(actions: TableActions<TData>): TableActionItem<TData>[][] {
  if (actions.length === 0) return []
  return Array.isArray(actions[0])
    ? (actions as TableActionItem<TData>[][])
    : [actions as TableActionItem<TData>[]]
}

function itemKey<TData>(item: TableActionItem<TData>, index: number) {
  return item.key ?? (typeof item.label === "string" ? item.label : `action-${index}`)
}

const DEFAULT_CONFIRM: Required<TableActionConfirm> = {
  title: "Are you sure?",
  description: "This action cannot be undone.",
  confirmLabel: "Continue",
  cancelLabel: "Cancel",
}

/* -------------------------------------------------------------------------- */
/*                                 Component                                  */
/* -------------------------------------------------------------------------- */

export function TableAction<TData>({
  row,
  actions,
  label = "Actions",
  triggerLabel = "Open menu",
  triggerContent,
  triggerClassName,
  contentClassName,
  side = "bottom",
  align = "end",
  sideOffset = 4,
  disabled,
}: TableActionProps<TData>) {
  const [pending, setPending] = React.useState<TableActionItem<TData> | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [running, setRunning] = React.useState(false)

  const groups = React.useMemo(
    () =>
      toGroups(actions)
        .map((group) => group.filter((item) => !resolve(item.hidden, row)))
        .filter((group) => group.length > 0),
    [actions, row]
  )

  if (groups.length === 0) return null

  const handleSelect = (item: TableActionItem<TData>) => {
    if (item.confirm) {
      setPending(item)
      setDialogOpen(true)
      return
    }
    void item.onSelect(row)
  }

  const handleConfirm = async () => {
    if (!pending) return
    setRunning(true)
    try {
      await pending.onSelect(row)
      setDialogOpen(false)
    } finally {
      setRunning(false)
    }
  }

  const confirm: Required<TableActionConfirm> = {
    ...DEFAULT_CONFIRM,
    ...(typeof pending?.confirm === "object" ? pending.confirm : {}),
  }
  const destructive = pending?.variant === "destructive"

  let index = 0

  return (
    <>
      <Menu.Root>
        <Menu.Trigger
          data-slot="table-action-trigger"
          disabled={disabled}
          // Don't trigger row click handlers on clickable rows.
          onClick={(event) => event.stopPropagation()}
          className={cn(
            "inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors",
            "hover:bg-accent hover:text-accent-foreground data-popup-open:bg-accent data-popup-open:text-accent-foreground",
            "focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
            "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
            triggerClassName
          )}
        >
          {triggerContent ?? <MoreHorizontalIcon />}
          <span className="sr-only">{triggerLabel}</span>
        </Menu.Trigger>

        <Menu.Portal>
          <Menu.Positioner
            side={side}
            align={align}
            sideOffset={sideOffset}
            className="isolate z-50 outline-none"
          >
            <Menu.Popup
              data-slot="table-action-content"
              onClick={(event) => event.stopPropagation()}
              className={cn(
                "max-h-(--available-height) min-w-40 origin-(--transform-origin) overflow-y-auto overflow-x-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-none",
                "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
                contentClassName
              )}
            >
              {groups.map((group, groupIndex) => (
                <React.Fragment key={groupIndex}>
                  {groupIndex > 0 && (
                    <Menu.Separator className="-mx-1 my-1 h-px bg-border" />
                  )}
                  <Menu.Group>
                    {groupIndex === 0 && label != null && (
                      <Menu.GroupLabel className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                        {label}
                      </Menu.GroupLabel>
                    )}
                    {group.map((item) => (
                      <Menu.Item
                        key={itemKey(item, index++)}
                        data-slot="table-action-item"
                        data-variant={item.variant ?? "default"}
                        disabled={resolve(item.disabled, row)}
                        onClick={() => handleSelect(item)}
                        className={cn(
                          "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none",
                          "data-highlighted:bg-accent data-highlighted:text-accent-foreground",
                          "data-disabled:pointer-events-none data-disabled:opacity-50",
                          "data-[variant=destructive]:text-destructive data-[variant=destructive]:data-highlighted:bg-destructive/10 data-[variant=destructive]:data-highlighted:text-destructive dark:data-[variant=destructive]:data-highlighted:bg-destructive/20",
                          "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground data-[variant=destructive]:[&_svg]:text-destructive!"
                        )}
                      >
                        {item.icon}
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.shortcut && (
                          <span className="ml-auto text-xs tracking-widest text-muted-foreground">
                            {item.shortcut}
                          </span>
                        )}
                      </Menu.Item>
                    ))}
                  </Menu.Group>
                </React.Fragment>
              ))}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>

      <AlertDialog.Root
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!running) setDialogOpen(open)
        }}
        onOpenChangeComplete={(open) => {
          if (!open) setPending(null)
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Backdrop
            className={cn(
              "fixed inset-0 z-50 bg-black/50",
              "data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
            )}
          />
          <AlertDialog.Popup
            data-slot="table-action-confirm"
            onClick={(event) => event.stopPropagation()}
            className={cn(
              "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border bg-background p-6 shadow-lg outline-none sm:max-w-lg",
              "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
            )}
          >
            <div className="flex flex-col gap-2 text-center sm:text-left">
              <AlertDialog.Title className="text-lg font-semibold">
                {confirm.title}
              </AlertDialog.Title>
              <AlertDialog.Description className="text-sm text-muted-foreground">
                {confirm.description}
              </AlertDialog.Description>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <AlertDialog.Close
                disabled={running}
                className={cn(buttonClass, "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50")}
              >
                {confirm.cancelLabel}
              </AlertDialog.Close>
              <button
                type="button"
                disabled={running}
                onClick={handleConfirm}
                className={cn(
                  buttonClass,
                  destructive
                    ? "bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40"
                    : "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
                )}
              >
                {running && <Loader2Icon className="animate-spin" />}
                {confirm.confirmLabel}
              </button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  )
}

const buttonClass =
  "inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium outline-none transition-all focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
