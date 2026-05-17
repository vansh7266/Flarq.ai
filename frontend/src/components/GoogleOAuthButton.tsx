import { GoogleLogin } from '@react-oauth/google'

interface GoogleOAuthButtonProps {
  onSuccess: (credential: string) => void
  onError?: () => void
}

export function GoogleOAuthButton({ onSuccess, onError }: GoogleOAuthButtonProps) {
  return (
    <GoogleLogin
      onSuccess={(credentialResponse) => {
        if (credentialResponse.credential) {
          onSuccess(credentialResponse.credential)
        }
      }}
      onError={() => {
        onError?.()
      }}
      theme="outline"
      size="large"
      text="continue_with"
      width={400}
      shape="rectangular"
    />
  )
}
