import Swal from 'sweetalert2'

const theme = {
  background: '#ffffff',
  color: '#141414',
  confirmButtonColor: '#111111',
  cancelButtonColor: '#f1efe9',
  backdrop: 'rgba(17,17,17,.48)',
}

export const showSuccess = (title: string, text?: string) =>
  Swal.fire({
    ...theme,
    icon: 'success',
    title,
    text,
    confirmButtonText: 'Done',
    buttonsStyling: true,
    customClass: { confirmButton: 'anyworkAlertConfirm' },
  })

export const showError = (title: string, text?: string) =>
  Swal.fire({
    ...theme,
    icon: 'error',
    title,
    text,
    confirmButtonText: 'Close',
    customClass: { confirmButton: 'anyworkAlertConfirm' },
  })

export const showInfo = (title: string, text?: string) =>
  Swal.fire({
    ...theme,
    icon: 'info',
    title,
    text,
    confirmButtonText: 'Okay',
    customClass: { confirmButton: 'anyworkAlertConfirm' },
  })

export const showWarning = (title: string, text?: string) =>
  Swal.fire({
    ...theme,
    icon: 'warning',
    title,
    text,
    confirmButtonText: 'Okay',
    customClass: { confirmButton: 'anyworkAlertConfirm' },
  })

export const confirmAction = async ({
  title,
  text,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false,
}: {
  title: string
  text?: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}) => {
  const result = await Swal.fire({
    ...theme,
    icon: danger ? 'warning' : 'question',
    title,
    text,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    confirmButtonColor: danger ? '#9f3d2d' : '#111111',
    cancelButtonColor: '#f1efe9',
    customClass: {
      confirmButton: 'anyworkAlertConfirm',
      cancelButton: 'anyworkAlertCancel',
    },
    reverseButtons: true,
  })

  return result.isConfirmed
}

export const showToast = (
  title: string,
  icon: 'success' | 'error' | 'info' | 'warning' = 'success',
) =>
  Swal.fire({
    ...theme,
    toast: true,
    position: 'top-end',
    icon,
    title,
    showConfirmButton: false,
    timer: 2400,
    timerProgressBar: true,
    customClass: { popup: 'anyworkToast' },
  })
