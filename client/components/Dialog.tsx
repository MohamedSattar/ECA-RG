import * as React from "react";
import {
  Dialog as FluentDialog,
  DialogType,
  DialogFooter,
  IDialogContentProps,
} from "@fluentui/react/lib/Dialog";
import { PrimaryButton, DefaultButton } from "@fluentui/react/lib/Button";
import { IModalProps } from "@fluentui/react/lib/Modal";

export interface MessageDialogProps {
  hidden: boolean;
  title: string;
  message?: string;
  subText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  onDismiss?: () => void;
  confirmText?: string;
  cancelText?: string;
  dialogType?: DialogType;
  showCancel?: boolean;
  isBlocking?: boolean;
  maxWidth?: number;
  children?: React.ReactNode;
}

export const MessageDialog: React.FC<MessageDialogProps> = ({
  hidden,
  title,
  message,
  subText,
  onConfirm,
  onCancel,
  onDismiss,
  confirmText = "OK",
  cancelText = "Cancel",
  dialogType = DialogType.normal,
  showCancel = true,
  isBlocking = true,
  maxWidth = 450,
  children,
}) => {
  const dialogContentProps: IDialogContentProps = {
    type: dialogType,
    title: title,
    subText: subText || message,
  };

  const modalProps: IModalProps = {
    isBlocking: isBlocking,
    styles: { main: { maxWidth: maxWidth } },
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
    } else if (onCancel) {
      onCancel();
    }
  };

  return (
    <FluentDialog
      hidden={hidden}
      onDismiss={handleDismiss}
      dialogContentProps={dialogContentProps}
      modalProps={modalProps}
    >
      {children}
      <DialogFooter>
        <PrimaryButton onClick={handleConfirm} text={confirmText} />
        {showCancel && <DefaultButton onClick={handleCancel} text={cancelText} />}
      </DialogFooter>
    </FluentDialog>
  );
};

// Confirmation Dialog variant
export interface ConfirmDialogProps {
  hidden: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  isBlocking?: boolean;
  children?: React.ReactNode;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  hidden,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  showCancel = true,
  isBlocking = true,
  children,
}) => {
  return (
    <MessageDialog
      hidden={hidden}
      title={title}
      message={message}
      onConfirm={onConfirm}
      onCancel={onCancel}
      confirmText={confirmText}
      cancelText={cancelText}
      dialogType={DialogType.normal}
      showCancel={showCancel}
      isBlocking={isBlocking}
    >
      {children}
    </MessageDialog>
  );
};

// Alert Dialog variant (no cancel button)
export interface AlertDialogProps {
  hidden: boolean;
  title: string;
  message: string;
  onDismiss: () => void;
  confirmText?: string;
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
  hidden,
  title,
  message,
  onDismiss,
  confirmText = "OK",
}) => {
  return (
    <MessageDialog
      hidden={hidden}
      title={title}
      message={message}
      onConfirm={onDismiss}
      onDismiss={onDismiss}
      confirmText={confirmText}
      showCancel={false}
    />
  );
};

// Error Dialog variant
export interface ErrorDialogProps {
  hidden: boolean;
  title?: string;
  message: string;
  onDismiss: () => void;
}

export const ErrorDialog: React.FC<ErrorDialogProps> = ({
  hidden,
  title = "Error",
  message,
  onDismiss,
}) => {
  return (
    <MessageDialog
      hidden={hidden}
      title={title}
      message={message}
      onConfirm={onDismiss}
      onDismiss={onDismiss}
      confirmText="OK"
      dialogType={DialogType.close}
      showCancel={false}
    />
  );
};

// Success Dialog variant
export interface SuccessDialogProps {
  hidden: boolean;
  title?: string;
  message: string;
  onDismiss: () => void;
}

export const SuccessDialog: React.FC<SuccessDialogProps> = ({
  hidden,
  title = "Success",
  message,
  onDismiss,
}) => {
  return (
    <MessageDialog
      hidden={hidden}
      title={title}
      message={message}
      onConfirm={onDismiss}
      onDismiss={onDismiss}
      confirmText="OK"
      dialogType={DialogType.normal}
      showCancel={false}
    />
  );
};
