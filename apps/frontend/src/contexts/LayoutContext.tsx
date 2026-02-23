import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

/**
 * Layout context state interface
 * Manages the state of left drawer, right panel, and active tool
 */
export interface LayoutContextState {
  // Left drawer state
  leftDrawerOpen: boolean;
  toggleLeftDrawer: () => void;
  openLeftDrawer: () => void;
  closeLeftDrawer: () => void;

  // Right panel state
  rightPanelOpen: boolean;
  activeToolId: string | null;
  toggleRightPanel: () => void;
  setActiveTool: (toolId: string) => void;
  closeRightPanel: () => void;

  // Layout dimensions (for content area calculations)
  leftRailWidth: number;
  leftDrawerWidth: number;
  rightRailWidth: number;
  rightPanelWidth: number;
  appBarHeight: number;
}

// Layout dimension constants
export const LEFT_RAIL_WIDTH = 56;
export const LEFT_DRAWER_WIDTH = 180;
export const RIGHT_RAIL_WIDTH = 56;
export const RIGHT_PANEL_WIDTH = 400;
export const APPBAR_HEIGHT = 64;

const LayoutContext = createContext<LayoutContextState | undefined>(undefined);

interface LayoutProviderProps {
  children: React.ReactNode;
  defaultLeftDrawerOpen?: boolean;
  defaultRightPanelOpen?: boolean;
}

/**
 * LayoutProvider component
 * Provides layout state management for the entire application
 */
export function LayoutProvider({
  children,
  defaultLeftDrawerOpen = false,
  defaultRightPanelOpen = false,
}: LayoutProviderProps) {
  // Left drawer state
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(defaultLeftDrawerOpen);

  // Right panel state
  const [rightPanelOpen, setRightPanelOpen] = useState(defaultRightPanelOpen);
  const [activeToolId, setActiveToolId] = useState<string | null>(null);

  // Left drawer actions
  const toggleLeftDrawer = useCallback(() => {
    setLeftDrawerOpen((prev) => !prev);
  }, []);

  const openLeftDrawer = useCallback(() => {
    setLeftDrawerOpen(true);
  }, []);

  const closeLeftDrawer = useCallback(() => {
    setLeftDrawerOpen(false);
  }, []);

  // Right panel actions
  const toggleRightPanel = useCallback(() => {
    setRightPanelOpen((prev) => {
      if (prev) {
        // Closing - clear active tool
        setActiveToolId(null);
      }
      return !prev;
    });
  }, []);

  const setActiveTool = useCallback((toolId: string) => {
    setActiveToolId(toolId);
    setRightPanelOpen(true);
  }, []);

  const closeRightPanel = useCallback(() => {
    setRightPanelOpen(false);
    setActiveToolId(null);
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<LayoutContextState>(
    () => ({
      // Left drawer
      leftDrawerOpen,
      toggleLeftDrawer,
      openLeftDrawer,
      closeLeftDrawer,

      // Right panel
      rightPanelOpen,
      activeToolId,
      toggleRightPanel,
      setActiveTool,
      closeRightPanel,

      // Layout dimensions
      leftRailWidth: LEFT_RAIL_WIDTH,
      leftDrawerWidth: LEFT_DRAWER_WIDTH,
      rightRailWidth: RIGHT_RAIL_WIDTH,
      rightPanelWidth: RIGHT_PANEL_WIDTH,
      appBarHeight: APPBAR_HEIGHT,
    }),
    [
      leftDrawerOpen,
      toggleLeftDrawer,
      openLeftDrawer,
      closeLeftDrawer,
      rightPanelOpen,
      activeToolId,
      toggleRightPanel,
      setActiveTool,
      closeRightPanel,
    ]
  );

  return (
    <LayoutContext.Provider value={value}>
      {children}
    </LayoutContext.Provider>
  );
}

/**
 * Custom hook to access layout context
 * @throws Error if used outside of LayoutProvider
 */
export function useLayout(): LayoutContextState {
  const context = useContext(LayoutContext);

  if (context === undefined) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }

  return context;
}

/**
 * Custom hook to calculate content area margins based on layout state
 * Returns FIXED CSS values for marginLeft and marginRight
 * Margins do not change when drawers open/close because drawers use overlay behavior
 */
export function useContentMargins(): { marginLeft: number; marginRight: number } {
  return {
    marginLeft: LEFT_RAIL_WIDTH,   // Always 56px (just the rail, not drawer)
    marginRight: RIGHT_RAIL_WIDTH, // Always 56px (just the rail, not panel)
  };
}

export default LayoutContext;
