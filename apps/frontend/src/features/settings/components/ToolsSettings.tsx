import { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  Snackbar,
  Tooltip,
} from '@mui/material';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import ListAltIcon from '@mui/icons-material/ListAlt';
import LinkIcon from '@mui/icons-material/Link';
import CodeIcon from '@mui/icons-material/Code';
import LanguageIcon from '@mui/icons-material/Language';
import { defaultTools } from '@features/tools/config/toolsConfig';
import type { ToolConfig, CustomToolRequest } from '../types';

// Icon mapping for tools
const TOOL_ICONS: Record<string, React.ReactNode> = {
  AutoAwesome: <AutoAwesomeIcon />,
  AcUnit: <AcUnitIcon />,
  LocalHospital: <LocalHospitalIcon />,
  QrCode2: <QrCode2Icon />,
  ListAlt: <ListAltIcon />,
  Link: <LinkIcon />,
  Code: <CodeIcon />,
  Language: <LanguageIcon />,
};

// Available icons for custom tools
const AVAILABLE_ICONS = [
  { value: 'Link', label: 'Link' },
  { value: 'Code', label: 'Code' },
  { value: 'Language', label: 'Globe' },
  { value: 'LocalHospital', label: 'Medical' },
  { value: 'ListAlt', label: 'List' },
  { value: 'AutoAwesome', label: 'Sparkle' },
];

/**
 * Get icon component for a tool
 */
function getToolIcon(iconName: string) {
  return TOOL_ICONS[iconName] || <LinkIcon />;
}

/**
 * Convert default tools to ToolConfig format
 */
function convertToToolConfig(): ToolConfig[] {
  return defaultTools.map((tool) => ({
    id: tool.id,
    name: tool.name,
    description: tool.description,
    icon: tool.icon,
    type: tool.type,
    url: tool.url,
    isBuiltIn: tool.isBuiltIn,
    isEnabled: tool.isEnabled,
    isCustom: false,
    order: tool.order,
    requiredPermissions: tool.requiredPermissions,
  }));
}

/**
 * Sortable table row component
 */
function SortableRow({
  tool,
  onToggle,
  onDelete,
}: {
  tool: ToolConfig;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tool.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: isDragging ? 'rgba(25, 118, 210, 0.08)' : undefined,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell sx={{ width: 50 }}>
        <IconButton
          {...attributes}
          {...listeners}
          size="small"
          sx={{ cursor: 'grab', '&:active': { cursor: 'grabbing' } }}
        >
          <DragIndicatorIcon />
        </IconButton>
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: 1,
              bgcolor: 'primary.light',
              color: 'primary.contrastText',
            }}
          >
            {getToolIcon(tool.icon)}
          </Box>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {tool.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {tool.description}
            </Typography>
          </Box>
        </Box>
      </TableCell>
      <TableCell>
        <Chip
          label={tool.type}
          size="small"
          variant="outlined"
          color={tool.type === 'component' ? 'primary' : 'default'}
        />
      </TableCell>
      <TableCell>
        {tool.isBuiltIn ? (
          <Chip label="Built-in" size="small" color="secondary" />
        ) : (
          <Chip label="Custom" size="small" variant="outlined" />
        )}
      </TableCell>
      <TableCell align="center">
        <Switch
          checked={tool.isEnabled}
          onChange={() => onToggle(tool.id)}
          disabled={tool.id === 'copilot'} // Copilot always enabled
          color="primary"
        />
      </TableCell>
      <TableCell align="right">
        {!tool.isBuiltIn && (
          <Tooltip title="Delete custom tool">
            <IconButton
              size="small"
              color="error"
              onClick={() => onDelete(tool.id)}
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        )}
      </TableCell>
    </TableRow>
  );
}

/**
 * ToolsSettings - Tools management section
 * Handles tool enable/disable, reordering, and custom tool creation
 */
export function ToolsSettings() {
  // State
  const [tools, setTools] = useState<ToolConfig[]>(convertToToolConfig());
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteToolId, setDeleteToolId] = useState<string | null>(null);

  // Form state for custom tool
  const [customTool, setCustomTool] = useState<CustomToolRequest>({
    name: '',
    description: '',
    url: '',
    icon: 'Link',
  });

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setTools((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        // Update order values
        return newItems.map((item, index) => ({
          ...item,
          order: index + 1,
        }));
      });
      setSuccessMessage('Tool order updated');
    }
  }, []);

  // Handle tool toggle
  const handleToggleTool = useCallback((toolId: string) => {
    setTools((prev) =>
      prev.map((tool) =>
        tool.id === toolId ? { ...tool, isEnabled: !tool.isEnabled } : tool
      )
    );
  }, []);

  // Handle custom tool form changes
  const handleCustomToolChange = useCallback(
    (field: keyof CustomToolRequest) =>
      (event: React.ChangeEvent<HTMLInputElement>) => {
        setCustomTool((prev) => ({
          ...prev,
          [field]: event.target.value,
        }));
      },
    []
  );

  // Handle add custom tool
  const handleAddCustomTool = useCallback(() => {
    if (!customTool.name.trim() || !customTool.url.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    // Validate URL
    try {
      new URL(customTool.url);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    const newTool: ToolConfig = {
      id: `custom-${Date.now()}`,
      name: customTool.name,
      description: customTool.description || 'Custom tool',
      icon: customTool.icon,
      type: 'iframe',
      url: customTool.url,
      isBuiltIn: false,
      isEnabled: true,
      isCustom: true,
      order: tools.length + 1,
    };

    setTools((prev) => [...prev, newTool]);
    setSuccessMessage('Custom tool added successfully');
    setAddDialogOpen(false);
    setCustomTool({ name: '', description: '', url: '', icon: 'Link' });
  }, [customTool, tools.length]);

  // Handle delete tool
  const handleDeleteTool = useCallback(() => {
    if (!deleteToolId) return;

    setTools((prev) => prev.filter((t) => t.id !== deleteToolId));
    setSuccessMessage('Tool deleted successfully');
    setDeleteToolId(null);
  }, [deleteToolId]);

  // Handle snackbar close
  const handleCloseSnackbar = useCallback(() => {
    setSuccessMessage(null);
  }, []);

  // Count enabled/disabled
  const enabledCount = tools.filter((t) => t.isEnabled).length;
  const customCount = tools.filter((t) => t.isCustom).length;

  return (
    <Box>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Available Tools
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {enabledCount} of {tools.length} tools enabled
              {customCount > 0 && ` (${customCount} custom)`}
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddDialogOpen(true)}
          >
            Add Custom Tool
          </Button>
        </Box>
      </Paper>

      {/* Tools Table */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
        }}
      >
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ width: 50 }}></TableCell>
                <TableCell>Tool</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Source</TableCell>
                <TableCell align="center">Enabled</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={tools.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {tools
                    .sort((a, b) => a.order - b.order)
                    .map((tool) => (
                      <SortableRow
                        key={tool.id}
                        tool={tool}
                        onToggle={handleToggleTool}
                        onDelete={setDeleteToolId}
                      />
                    ))}
                </SortableContext>
              </DndContext>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Instructions */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mt: 3,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'grey.50',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          <strong>Tip:</strong> Drag and drop tools to reorder them in the tools
          panel. Built-in tools cannot be deleted but can be disabled. The
          Caladrius Copilot tool is always enabled.
        </Typography>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert
          severity="error"
          sx={{ mt: 2 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {/* Add Custom Tool Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Custom Tool</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Create a custom tool that embeds an external URL in the tools panel.
          </DialogContentText>

          <TextField
            label="Tool Name"
            value={customTool.name}
            onChange={handleCustomToolChange('name')}
            fullWidth
            required
            sx={{ mb: 2 }}
            placeholder="e.g., Drug Interactions Checker"
          />

          <TextField
            label="Description"
            value={customTool.description}
            onChange={handleCustomToolChange('description')}
            fullWidth
            sx={{ mb: 2 }}
            placeholder="Brief description of the tool"
          />

          <TextField
            label="URL"
            value={customTool.url}
            onChange={handleCustomToolChange('url')}
            fullWidth
            required
            sx={{ mb: 2 }}
            placeholder="https://example.com/tool"
            helperText="The URL must support embedding in an iframe"
          />

          <TextField
            select
            label="Icon"
            value={customTool.icon}
            onChange={handleCustomToolChange('icon')}
            fullWidth
          >
            {AVAILABLE_ICONS.map((icon) => (
              <MenuItem key={icon.value} value={icon.value}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getToolIcon(icon.value)}
                  <span>{icon.label}</span>
                </Box>
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddCustomTool} variant="contained">
            Add Tool
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Tool Dialog */}
      <Dialog
        open={!!deleteToolId}
        onClose={() => setDeleteToolId(null)}
      >
        <DialogTitle>Delete Custom Tool</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this custom tool? This action cannot
            be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteToolId(null)}>Cancel</Button>
          <Button
            onClick={handleDeleteTool}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity="success"
          variant="filled"
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
