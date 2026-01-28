import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Paper,
  Chip,
  Avatar,
  CircularProgress,
  Tooltip,
  alpha,
} from '@mui/material';
import {
  Send as SendIcon,
  Refresh as RefreshIcon,
  ContentCopy as CopyIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  CloudUpload as UploadIcon,
  DocumentScanner as OcrIcon,
  Analytics as AnalyzeIcon,
  AutoAwesome as CopilotIcon,
} from '@mui/icons-material';

/**
 * Props interface for CopilotTool component
 */
interface CopilotToolProps {
  onClose?: () => void;
}

/**
 * Message interface for chat messages
 */
interface Message {
  role: 'user' | 'assistant';
  content: string;
  id: string;
  timestamp: Date;
}

/**
 * Quick action configuration
 */
interface QuickAction {
  label: string;
  icon: React.ReactNode;
  action: string;
}

/**
 * CopilotTool component renders the Caladrius Copilot interface
 * inside the RightPanel when the Copilot tool is active.
 *
 * Features:
 * - Welcome message with Copilot branding
 * - Action buttons (refresh, copy, thumbs up/down)
 * - Quick action chips for common tasks
 * - Scrollable chat messages area
 * - Fixed input area at bottom
 */
export function CopilotTool({ onClose }: CopilotToolProps) {
  // Placeholder state - actual CopilotKit integration will come later
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Quick actions for the chips
  const quickActions: QuickAction[] = [
    {
      label: 'Start Document Upload',
      icon: <UploadIcon sx={{ fontSize: 16 }} />,
      action: 'upload',
    },
    {
      label: 'Review OCR Extraction',
      icon: <OcrIcon sx={{ fontSize: 16 }} />,
      action: 'ocr',
    },
    {
      label: 'Analyze Medical Content',
      icon: <AnalyzeIcon sx={{ fontSize: 16 }} />,
      action: 'analyze',
    },
  ];

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending a message
  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Simulate assistant response (placeholder for CopilotKit integration)
    setTimeout(() => {
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: `I understand you want to: "${userMessage.content}". This is a placeholder response. CopilotKit integration will be implemented soon to provide real AI-powered responses for medical document analysis and clinical support.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  }, [inputValue, isLoading]);

  // Handle key down in input (replaces deprecated onKeyPress)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  // Handle quick action click
  const handleQuickAction = useCallback((action: string) => {
    const actionMessages: Record<string, string> = {
      upload: 'I want to upload a medical document for analysis.',
      ocr: 'Please review the OCR extraction from my document.',
      analyze: 'Analyze the medical content in my document.',
    };
    setInputValue(actionMessages[action] || '');
    inputRef.current?.focus();
  }, []);

  // Handle refresh conversation
  const handleRefresh = useCallback(() => {
    setMessages([]);
  }, []);

  // Handle copy last response
  const handleCopy = useCallback(async () => {
    const lastAssistantMessage = [...messages]
      .reverse()
      .find((m) => m.role === 'assistant');
    if (lastAssistantMessage) {
      try {
        await navigator.clipboard.writeText(lastAssistantMessage.content);
      } catch {
        // Clipboard API not available
      }
    }
  }, [messages]);

  // Handle feedback (placeholder)
  const handleFeedback = useCallback((type: 'up' | 'down') => {
    console.log(`Feedback: thumbs ${type}`);
    // TODO: Implement feedback submission
  }, []);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        bgcolor: 'background.paper',
      }}
    >
      {/* Welcome Message Area */}
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          <Typography
            sx={{
              fontSize: '1.25rem',
              lineHeight: 1.4,
            }}
          >
            <span role="img" aria-label="wave">
              👋
            </span>
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: 'text.primary',
              lineHeight: 1.5,
            }}
          >
            Hi! I'm Caladrius Copilot. Share a medical document or ask me to
            analyze any report.
          </Typography>
        </Box>

        {/* Action Buttons Row */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            mt: 1.5,
          }}
        >
          <Tooltip title="Refresh conversation">
            <IconButton
              size="small"
              onClick={handleRefresh}
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  color: 'primary.main',
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                },
              }}
            >
              <RefreshIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Copy last response">
            <IconButton
              size="small"
              onClick={handleCopy}
              disabled={!messages.some((m) => m.role === 'assistant')}
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  color: 'primary.main',
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                },
              }}
            >
              <CopyIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Helpful response">
            <IconButton
              size="small"
              onClick={() => handleFeedback('up')}
              disabled={!messages.some((m) => m.role === 'assistant')}
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  color: 'success.main',
                  bgcolor: (theme) => alpha(theme.palette.success.main, 0.08),
                },
              }}
            >
              <ThumbUpIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Unhelpful response">
            <IconButton
              size="small"
              onClick={() => handleFeedback('down')}
              disabled={!messages.some((m) => m.role === 'assistant')}
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  color: 'error.main',
                  bgcolor: (theme) => alpha(theme.palette.error.main, 0.08),
                },
              }}
            >
              <ThumbDownIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Quick Action Chips */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        {quickActions.map((action) => (
          <Chip
            key={action.action}
            label={action.label}
            variant="outlined"
            size="small"
            onClick={() => handleQuickAction(action.action)}
            sx={{
              cursor: 'pointer',
              borderColor: 'divider',
              color: 'text.primary',
              fontSize: '0.8125rem',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
              },
            }}
          />
        ))}
      </Box>

      {/* Chat Messages Area */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 2,
          py: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          '&::-webkit-scrollbar': {
            width: 6,
          },
          '&::-webkit-scrollbar-track': {
            bgcolor: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: 'divider',
            borderRadius: 3,
          },
        }}
        role="log"
        aria-label="Chat messages"
      >
        {messages.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              color: 'text.secondary',
              textAlign: 'center',
              py: 4,
            }}
          >
            <CopilotIcon
              sx={{
                fontSize: 48,
                color: 'primary.main',
                opacity: 0.3,
                mb: 2,
              }}
            />
            <Typography variant="body2" color="text.secondary">
              Start a conversation or select a quick action above
            </Typography>
          </Box>
        ) : (
          messages.map((message) => (
            <Box
              key={message.id}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems:
                  message.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  maxWidth: '85%',
                  bgcolor:
                    message.role === 'user'
                      ? 'primary.main'
                      : 'background.default',
                  color:
                    message.role === 'user'
                      ? 'primary.contrastText'
                      : 'text.primary',
                  borderRadius:
                    message.role === 'user'
                      ? '16px 16px 4px 16px'
                      : '16px 16px 16px 4px',
                  boxShadow:
                    message.role === 'user'
                      ? (theme) =>
                          `0 2px 8px ${alpha(theme.palette.primary.main, 0.3)}`
                      : 1,
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mb: 0.5,
                  }}
                >
                  <Avatar
                    sx={{
                      width: 20,
                      height: 20,
                      bgcolor:
                        message.role === 'user'
                          ? 'primary.dark'
                          : 'secondary.main',
                      fontSize: '0.75rem',
                    }}
                  >
                    {message.role === 'user' ? 'U' : 'C'}
                  </Avatar>
                  <Typography
                    variant="caption"
                    sx={{ opacity: 0.8, fontWeight: 500 }}
                  >
                    {message.role === 'user' ? 'You' : 'Copilot'}
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  sx={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    lineHeight: 1.5,
                  }}
                >
                  {message.content}
                </Typography>
              </Paper>
              <Typography
                variant="caption"
                sx={{
                  mt: 0.5,
                  px: 1,
                  opacity: 0.5,
                  fontSize: '0.65rem',
                }}
              >
                {message.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Typography>
            </Box>
          ))
        )}

        {/* Loading indicator */}
        {isLoading && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              color: 'text.secondary',
            }}
          >
            <CircularProgress size={16} />
            <Typography variant="body2">Copilot is thinking...</Typography>
          </Box>
        )}

        <div ref={messagesEndRef} />
      </Box>

      {/* Input Area */}
      <Box
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 1,
            bgcolor: 'background.default',
            borderRadius: 3,
            p: 1,
            border: 1,
            borderColor: 'divider',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            '&:focus-within': {
              borderColor: 'primary.main',
              boxShadow: (theme) =>
                `0 0 0 2px ${alpha(theme.palette.primary.main, 0.1)}`,
            },
          }}
        >
          <TextField
            inputRef={inputRef}
            fullWidth
            multiline
            maxRows={4}
            placeholder="Ask me anything about your medical document..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            variant="standard"
            InputProps={{
              disableUnderline: true,
            }}
            sx={{
              '& .MuiInputBase-input': {
                fontSize: '0.875rem',
                px: 1,
              },
            }}
            aria-label="Message input"
          />
          <Tooltip title="Send message">
            <span>
              <IconButton
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                sx={{
                  bgcolor: inputValue.trim() ? 'primary.main' : 'transparent',
                  color: inputValue.trim()
                    ? 'primary.contrastText'
                    : 'action.disabled',
                  '&:hover': {
                    bgcolor: inputValue.trim() ? 'primary.dark' : 'transparent',
                  },
                  '&.Mui-disabled': {
                    bgcolor: 'transparent',
                  },
                  width: 36,
                  height: 36,
                }}
                aria-label="Send message"
              >
                <SendIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
}

export default CopilotTool;
