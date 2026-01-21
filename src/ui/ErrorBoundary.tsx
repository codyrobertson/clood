/**
 * Error Boundary Component (UOW-1201)
 *
 * Catches and handles React errors gracefully in the terminal UI.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Text } from 'ink';

export interface ErrorBoundaryProps {
  children: ReactNode;
  /** Fallback component to render on error */
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  /** Called when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Whether to show error details */
  showDetails?: boolean;
  /** Identifier for this boundary */
  name?: string;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  reset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const { error } = this.state;
      const { fallback, showDetails = true, name } = this.props;

      // Use custom fallback if provided
      if (fallback) {
        if (typeof fallback === 'function') {
          return fallback(error!, this.reset);
        }
        return fallback;
      }

      // Default error display
      return (
        <ErrorDisplay
          error={error!}
          componentStack={this.state.errorInfo?.componentStack}
          showDetails={showDetails}
          boundaryName={name}
          onReset={this.reset}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorDisplayProps {
  error: Error;
  componentStack?: string | null;
  showDetails: boolean;
  boundaryName?: string;
  onReset?: () => void;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  componentStack,
  showDetails,
  boundaryName,
}) => {
  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="red">
      <Box marginBottom={1}>
        <Text color="red" bold>
          ⚠ Error{boundaryName ? ` in ${boundaryName}` : ''}
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text color="white">{error.message}</Text>
      </Box>

      {showDetails && error.stack && (
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor>Stack trace:</Text>
          <Box marginLeft={2}>
            <Text dimColor>
              {error.stack
                .split('\n')
                .slice(1, 6)
                .map((line) => line.trim())
                .join('\n')}
            </Text>
          </Box>
        </Box>
      )}

      {showDetails && componentStack && (
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor>Component stack:</Text>
          <Box marginLeft={2}>
            <Text dimColor>
              {componentStack
                .split('\n')
                .slice(0, 5)
                .join('\n')}
            </Text>
          </Box>
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>Press any key to attempt recovery...</Text>
      </Box>
    </Box>
  );
};

/**
 * Minimal error fallback for critical components
 */
export const MinimalErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <Box>
    <Text color="red">Error: {error.message}</Text>
  </Box>
);

/**
 * Hook to create error boundary reset function
 */
export function useErrorHandler(): (error: Error) => void {
  return (error: Error) => {
    throw error;
  };
}

/**
 * Higher-order component to wrap with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<ErrorBoundaryProps, 'children'> = {}
): React.FC<P> {
  const WrappedComponent: React.FC<P> = (props) => (
    <ErrorBoundary {...options}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}

/**
 * Component-specific error boundaries
 */
export const PanelErrorBoundary: React.FC<{ children: ReactNode; panelName: string }> = ({
  children,
  panelName,
}) => (
  <ErrorBoundary
    name={panelName}
    fallback={(error) => (
      <Box padding={1} borderStyle="single" borderColor="red">
        <Text color="red">
          {panelName} error: {error.message}
        </Text>
      </Box>
    )}
  >
    {children}
  </ErrorBoundary>
);

/**
 * Root-level error boundary with recovery
 */
export class RootErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null; attemptCount: number }
> {
  private readonly maxAttempts = 3;

  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      attemptCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Root error boundary caught:', error, errorInfo);
  }

  attemptRecovery = (): void => {
    if (this.state.attemptCount < this.maxAttempts) {
      this.setState((prev) => ({
        hasError: false,
        error: null,
        attemptCount: prev.attemptCount + 1,
      }));
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const canRetry = this.state.attemptCount < this.maxAttempts;

      return (
        <Box flexDirection="column" padding={2}>
          <Box marginBottom={1}>
            <Text color="red" bold>
              Application Error
            </Text>
          </Box>

          <Box marginBottom={1}>
            <Text>{this.state.error?.message || 'Unknown error'}</Text>
          </Box>

          {canRetry ? (
            <Box>
              <Text dimColor>
                Attempt {this.state.attemptCount + 1}/{this.maxAttempts}. Press any key to retry...
              </Text>
            </Box>
          ) : (
            <Box flexDirection="column">
              <Text color="red">Maximum retry attempts reached.</Text>
              <Text dimColor>Please restart the application.</Text>
            </Box>
          )}
        </Box>
      );
    }

    return this.props.children;
  }
}
