import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  AlertTitle,
  Collapse,
  Chip,
  Avatar,
  styled,
  alpha,
  Tooltip,
} from '@mui/material';
import {
  Send as SendIcon,
  SmartToy as AIIcon,
  Person as PersonIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  ContentCopy as CopyIcon,
  CheckCircle as CheckIcon,
  LocalHospital as MedicalIcon,
  Description as NoteIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useCopilotChat, useCopilotAction } from '@copilotkit/react-core';

/**
 * Styled components for the chat interface
 */
const ChatContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  overflow: 'hidden',
});

const MessagesContainer = styled(Box)(({ theme }) => ({
  flex: 1,
  overflowY: 'auto',
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  '&::-webkit-scrollbar': {
    width: 6,
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: theme.palette.divider,
    borderRadius: 3,
  },
}));

const MessageBubble = styled(Paper)<{ role: 'user' | 'assistant' }>(({ theme, role }) => ({
  padding: theme.spacing(1.5, 2),
  maxWidth: '85%',
  alignSelf: role === 'user' ? 'flex-end' : 'flex-start',
  backgroundColor:
    role === 'user'
      ? theme.palette.primary.main
      : theme.palette.background.default,
  color:
    role === 'user'
      ? theme.palette.primary.contrastText
      : theme.palette.text.primary,
  borderRadius:
    role === 'user'
      ? '16px 16px 4px 16px'
      : '16px 16px 16px 4px',
  boxShadow: role === 'user'
    ? `0 2px 8px ${alpha(theme.palette.primary.main, 0.3)}`
    : theme.shadows[1],
}));

const MessageHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  marginBottom: theme.spacing(0.5),
}));

const InputContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderTop: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
}));

const InputWrapper = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'flex-end',
  gap: theme.spacing(1),
  backgroundColor: theme.palette.background.default,
  borderRadius: 24,
  padding: theme.spacing(0.5, 1, 0.5, 2),
  border: `1px solid ${theme.palette.divider}`,
  transition: 'border-color 0.2s, box-shadow 0.2s',
  '&:focus-within': {
    borderColor: theme.palette.primary.main,
    boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.1)}`,
  },
}));

const ActionResultCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(1.5),
  marginTop: theme.spacing(1),
  backgroundColor: alpha(theme.palette.secondary.main, 0.05),
  border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
  borderRadius: 8,
}));

const LoadingIndicator = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1.5, 2),
  color: theme.palette.text.secondary,
}));

const WelcomeMessage = styled(Box)(({ theme }) => ({
  textAlign: 'center',
  padding: theme.spacing(4, 2),
  color: theme.palette.text.secondary,
}));

const SuggestionChip = styled(Chip)(({ theme }) => ({
  margin: theme.spacing(0.5),
  cursor: 'pointer',
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.1),
    borderColor: theme.palette.primary.main,
  },
}));

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  error?: string;
  actionResults?: Array<{
    action: string;
    result: unknown;
  }>;
}

/**
 * CopilotChat component provides the main chat interface
 * for interacting with the AI Health Assistant.
 */
export function CopilotChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // CopilotKit chat hook
  const {
    visibleMessages,
    appendMessage,
    isLoading: copilotLoading,
  } = useCopilotChat();

  // Register agent actions
  useCopilotAction({
    name: 'searchMedicalCodes',
    description: 'Search for ICD-10, CPT, or HCPCS medical codes based on a query',
    parameters: [
      {
        name: 'query',
        type: 'string',
        description: 'The search query for medical codes',
        required: true,
      },
      {
        name: 'codeType',
        type: 'string',
        description: 'Type of code to search: icd10, cpt, hcpcs, or all',
        required: false,
      },
    ],
    handler: async ({ query, codeType }) => {
      // This will be handled by the Copilot service
      return { query, codeType, status: 'delegated_to_service' };
    },
  });

  useCopilotAction({
    name: 'getPatientData',
    description: 'Retrieve patient data including demographics, medications, allergies, and conditions',
    parameters: [
      {
        name: 'patientId',
        type: 'string',
        description: 'The patient ID to retrieve data for',
        required: true,
      },
      {
        name: 'sections',
        type: 'string[]',
        description: 'Specific sections to retrieve: demographics, vitalSigns, medications, allergies, conditions, labResults, encounters',
        required: false,
      },
    ],
    handler: async ({ patientId, sections }) => {
      return { patientId, sections, status: 'delegated_to_service' };
    },
  });

  useCopilotAction({
    name: 'generateClinicalNote',
    description: 'Generate a clinical note for a patient encounter',
    parameters: [
      {
        name: 'patientId',
        type: 'string',
        description: 'The patient ID for the note',
        required: true,
      },
      {
        name: 'noteType',
        type: 'string',
        description: 'Type of note: progress, admission, discharge, consultation, procedure, operative, h-and-p',
        required: true,
      },
      {
        name: 'context',
        type: 'object',
        description: 'Additional context for note generation',
        required: false,
      },
    ],
    handler: async ({ patientId, noteType, context }) => {
      return { patientId, noteType, context, status: 'delegated_to_service' };
    },
  });

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, visibleMessages]);

  // Sync CopilotKit messages with local state
  useEffect(() => {
    if (visibleMessages && visibleMessages.length > 0) {
      const newMessages: ChatMessage[] = visibleMessages.map((msg: any, index) => ({
        id: `copilot-${index}`,
        role: (msg.role || 'assistant') as 'user' | 'assistant',
        content: msg.content || msg.text || '',
        timestamp: new Date(),
      }));
      setMessages(newMessages);
    }
  }, [visibleMessages]);

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      await appendMessage({
        content: inputValue.trim(),
      } as any);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your request. Please try again.',
          timestamp: new Date(),
          error: err instanceof Error ? err.message : 'Unknown error',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, appendMessage]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  const handleCopyMessage = useCallback(async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(messageId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Clipboard API not available
    }
  }, []);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setInputValue(suggestion);
    inputRef.current?.focus();
  }, []);

  const renderActionResult = (action: string, result: unknown) => {
    const getActionIcon = () => {
      switch (action) {
        case 'searchMedicalCodes':
          return <SearchIcon fontSize="small" />;
        case 'getPatientData':
          return <MedicalIcon fontSize="small" />;
        case 'generateClinicalNote':
          return <NoteIcon fontSize="small" />;
        default:
          return <AIIcon fontSize="small" />;
      }
    };

    return (
      <ActionResultCard elevation={0}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          {getActionIcon()}
          <Typography variant="caption" fontWeight={600}>
            {action.replace(/([A-Z])/g, ' $1').trim()}
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
          {JSON.stringify(result, null, 2).substring(0, 200)}
          {JSON.stringify(result).length > 200 && '...'}
        </Typography>
      </ActionResultCard>
    );
  };

  const suggestions = [
    'Search ICD-10 codes for diabetes',
    'Find CPT code for office visit',
    'Generate progress note',
    'What are common codes for hypertension?',
  ];

  return (
    <ChatContainer>
      {/* Error Alert */}
      <Collapse in={!!error}>
        <Alert
          severity="error"
          onClose={() => setError(null)}
          sx={{ m: 2, borderRadius: 2 }}
          action={
            <IconButton
              size="small"
              onClick={() => setError(null)}
              aria-label="Dismiss error"
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          }
        >
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      </Collapse>

      {/* Messages Area */}
      <MessagesContainer role="log" aria-label="Chat messages">
        {messages.length === 0 ? (
          <WelcomeMessage>
            <AIIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" gutterBottom>
              Welcome to Health AI Assistant
            </Typography>
            <Typography variant="body2" sx={{ mb: 3 }}>
              I can help you search medical codes, retrieve patient data,
              and generate clinical notes. How can I assist you today?
            </Typography>
            <Box>
              {suggestions.map((suggestion) => (
                <SuggestionChip
                  key={suggestion}
                  label={suggestion}
                  variant="outlined"
                  size="small"
                  onClick={() => handleSuggestionClick(suggestion)}
                />
              ))}
            </Box>
          </WelcomeMessage>
        ) : (
          messages.map((message) => (
            <Box
              key={message.id}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <MessageBubble role={message.role} elevation={0}>
                <MessageHeader>
                  <Avatar
                    sx={{
                      width: 24,
                      height: 24,
                      bgcolor: message.role === 'user' ? 'primary.dark' : 'secondary.main',
                    }}
                  >
                    {message.role === 'user' ? (
                      <PersonIcon sx={{ fontSize: 16 }} />
                    ) : (
                      <AIIcon sx={{ fontSize: 16 }} />
                    )}
                  </Avatar>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    {message.role === 'user' ? 'You' : 'AI Assistant'}
                  </Typography>
                  {message.role === 'assistant' && (
                    <Tooltip title={copiedId === message.id ? 'Copied!' : 'Copy message'}>
                      <IconButton
                        size="small"
                        onClick={() => handleCopyMessage(message.id, message.content)}
                        sx={{
                          ml: 'auto',
                          opacity: 0.6,
                          '&:hover': { opacity: 1 },
                        }}
                        aria-label="Copy message"
                      >
                        {copiedId === message.id ? (
                          <CheckIcon sx={{ fontSize: 14 }} />
                        ) : (
                          <CopyIcon sx={{ fontSize: 14 }} />
                        )}
                      </IconButton>
                    </Tooltip>
                  )}
                </MessageHeader>
                <Typography
                  variant="body2"
                  sx={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {message.content}
                </Typography>
                {message.error && (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      mt: 1,
                      color: 'error.main',
                    }}
                  >
                    <ErrorIcon sx={{ fontSize: 14 }} />
                    <Typography variant="caption">{message.error}</Typography>
                  </Box>
                )}
                {message.actionResults?.map((ar, idx) => (
                  <React.Fragment key={idx}>
                    {renderActionResult(ar.action, ar.result)}
                  </React.Fragment>
                ))}
              </MessageBubble>
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
        {(isLoading || copilotLoading) && (
          <LoadingIndicator>
            <CircularProgress size={16} />
            <Typography variant="body2">AI is thinking...</Typography>
          </LoadingIndicator>
        )}

        <div ref={messagesEndRef} />
      </MessagesContainer>

      {/* Input Area */}
      <InputContainer>
        <InputWrapper>
          <TextField
            ref={inputRef}
            fullWidth
            multiline
            maxRows={4}
            placeholder="Ask about medical codes, patient data, or clinical notes..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading || copilotLoading}
            variant="standard"
            InputProps={{
              disableUnderline: true,
            }}
            sx={{
              '& .MuiInputBase-input': {
                fontSize: '0.9rem',
              },
            }}
            aria-label="Message input"
          />
          <IconButton
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading || copilotLoading}
            color="primary"
            sx={{
              bgcolor: inputValue.trim() ? 'primary.main' : 'transparent',
              color: inputValue.trim() ? 'primary.contrastText' : 'action.disabled',
              '&:hover': {
                bgcolor: inputValue.trim() ? 'primary.dark' : 'transparent',
              },
              '&.Mui-disabled': {
                bgcolor: 'transparent',
              },
            }}
            aria-label="Send message"
          >
            <SendIcon fontSize="small" />
          </IconButton>
        </InputWrapper>
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            textAlign: 'center',
            mt: 1,
            color: 'text.disabled',
            fontSize: '0.65rem',
          }}
        >
          AI responses are for informational purposes. Always verify clinical information.
        </Typography>
      </InputContainer>
    </ChatContainer>
  );
}

export default CopilotChat;
