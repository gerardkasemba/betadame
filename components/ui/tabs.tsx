// components/ui/tabs.tsx
'use client'

import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'

// Simple cn replacement for class merging
const cn = (...classes: (string | undefined | null | false)[]) => {
  return classes.filter(Boolean).join(' ')
}

// Enhanced Tabs with localStorage persistence
const Tabs = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> & {
    storageKey?: string
  }
>(({ storageKey, defaultValue, value, onValueChange, ...props }, ref) => {
  const [localValue, setLocalValue] = React.useState(value || defaultValue)

  // Load from localStorage on mount
  React.useEffect(() => {
    if (storageKey && typeof window !== 'undefined') {
      const savedValue = localStorage.getItem(storageKey)
      if (savedValue) {
        setLocalValue(savedValue)
      }
    }
  }, [storageKey])

  const handleValueChange = (newValue: string) => {
    setLocalValue(newValue)
    
    // Save to localStorage
    if (storageKey && typeof window !== 'undefined') {
      localStorage.setItem(storageKey, newValue)
    }
    
    // Call original onValueChange if provided
    if (onValueChange) {
      onValueChange(newValue)
    }
  }

  return (
    <TabsPrimitive.Root
      ref={ref}
      value={value || localValue}
      onValueChange={handleValueChange}
      defaultValue={defaultValue}
      {...props}
    />
  )
})
Tabs.displayName = 'Tabs'

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      // Full width with gray background
      'w-full inline-flex items-center justify-between',
      // Gray background
      'bg-gray-100 p-1 rounded-lg',
      // Responsive sizing
      'h-12',
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      // Full width 50% split
      'flex-1 w-1/2 h-full',
      // Base styles
      'inline-flex items-center justify-center',
      // Typography
      'whitespace-nowrap text-sm font-medium',
      // Transition and focus
      'transition-all duration-200 ease-in-out',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
      // Disabled state
      'disabled:pointer-events-none disabled:opacity-50',
      // Rounded corners
      'rounded-md',
      // Default (inactive) state - transparent on gray background
      'text-gray-600 bg-transparent',
      // Active state - Blue background with white text (Safari compatible)
      'data-[state=active]:bg-blue-500 data-[state=active]:text-white',
      // Force Safari to recognize the active state
      'aria-selected:bg-blue-500 aria-selected:text-white',
      // Hover states
      'hover:bg-gray-200 data-[state=active]:hover:bg-blue-600 aria-selected:hover:bg-blue-600',
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      // Full width
      'w-full',
      // Smooth transitions
      'mt-4 transition-all duration-300 ease-in-out',
      // Focus styles
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

// Enhanced Segmented Tabs with 50/50 split
const SegmentedTabs = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> & {
    storageKey?: string
  }
>(({ storageKey, ...props }, ref) => (
  <Tabs
    ref={ref}
    storageKey={storageKey}
    {...props}
  />
))
SegmentedTabs.displayName = 'SegmentedTabs'

const SegmentedTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      // Full width segmented control
      'w-full inline-flex items-center bg-gray-100 p-1 rounded-lg h-12',
      className
    )}
    {...props}
  />
))
SegmentedTabsList.displayName = 'SegmentedTabsList'

const SegmentedTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      // 50% width
      'flex-1 w-1/2 h-full',
      // Base styles
      'inline-flex items-center justify-center',
      'text-sm font-medium transition-all duration-200',
      'rounded-md',
      // States
      'text-gray-600 bg-transparent',
      // Active state with Safari fallback
      'data-[state=active]:bg-blue-500 data-[state=active]:text-white',
      'aria-selected:bg-blue-500 aria-selected:text-white',
      'hover:bg-gray-200 data-[state=active]:hover:bg-blue-600 aria-selected:hover:bg-blue-600',
      className
    )}
    {...props}
  />
))
SegmentedTabsTrigger.displayName = 'SegmentedTabsTrigger'

// Simple TwoTab component for common 50/50 use cases
interface TwoTabsProps {
  tab1: {
    value: string
    label: string
    icon?: React.ReactNode
  }
  tab2: {
    value: string
    label: string
    icon?: React.ReactNode
  }
  defaultValue?: string
  storageKey?: string
  className?: string
  children: React.ReactNode
}

const TwoTabs = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  TwoTabsProps
>(({ tab1, tab2, defaultValue, storageKey, className, children, ...props }, ref) => {
  return (
    <Tabs 
      ref={ref} 
      defaultValue={defaultValue || tab1.value} 
      storageKey={storageKey}
      className={cn('w-full', className)}
      {...props}
    >
      <TabsList>
        <TabsTrigger value={tab1.value}>
          {tab1.icon && <span className="mr-2">{tab1.icon}</span>}
          {tab1.label}
        </TabsTrigger>
        <TabsTrigger value={tab2.value}>
          {tab2.icon && <span className="mr-2">{tab2.icon}</span>}
          {tab2.label}
        </TabsTrigger>
      </TabsList>
      {children}
    </Tabs>
  )
})
TwoTabs.displayName = 'TwoTabs'

export { 
  Tabs, 
  TabsList, 
  TabsTrigger, 
  TabsContent,
  SegmentedTabs,
  SegmentedTabsList,
  SegmentedTabsTrigger,
  TwoTabs
}