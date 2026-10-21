
import { useEffect, useRef } from "react";
import { apiRequest } from "../services/api";
import "./GoogleLoginButton.css";

// =====================================================
// ABS CUT — GOOGLE LOGIN BUTTON
// =====================================================

function GoogleLoginButton({
  onSuccess,
  onError,
  onLoading,
}) {
  const buttonRef = useRef(null);

  // Keep the latest callbacks without reinitializing
  // Google's SDK every time the parent re-renders.
  const callbacksRef = useRef({
    onSuccess,
    onError,
    onLoading,
  });

  callbacksRef.current = {
    onSuccess,
    onError,
    onLoading,
  };

  useEffect(() => {
    let cancelled = false;

    const clientId =
      import.meta.env.VITE_GOOGLE_CLIENT_ID;

    const reportError = (message) => {
      callbacksRef.current.onError?.(message);
    };

    if (!clientId) {
      console.error(
        "ABS CUT: VITE_GOOGLE_CLIENT_ID is missing."
      );

      reportError(
        "Google login is not configured."
      );

      return undefined;
    }

    // =================================================
    // HANDLE GOOGLE CREDENTIAL
    // =================================================

    const handleCredentialResponse = async (
      response
    ) => {
      if (cancelled) return;

      if (!response?.credential) {
        reportError(
          "Google did not return a valid credential."
        );

        return;
      }

      try {
        callbacksRef.current.onLoading?.(true);
        reportError("");

        // Send the Google ID token to our backend.
        const data = await apiRequest(
          "/auth/google",
          {
            method: "POST",
            body: JSON.stringify({
              credential: response.credential,
            }),
          }
        );

        if (cancelled) return;

        // A successful response must contain both
        // the ABS CUT user and our own JWT.
        if (!data?.user || !data?.token) {
          throw new Error(
            data?.message ||
              "Google authentication did not return a valid ABS CUT session."
          );
        }

        console.log(
          "ABS CUT: Google backend authentication succeeded."
        );

        // Call the parent success handler exactly once.
        if (
          typeof callbacksRef.current.onSuccess ===
          "function"
        ) {
          await callbacksRef.current.onSuccess(data);
        } else {
          throw new Error(
            "The Google login success handler is missing."
          );
        }
      } catch (error) {
        console.error(
          "ABS CUT Google login error:",
          error
        );

        reportError(
          error.message ||
            "Unable to authenticate with Google."
        );
      } finally {
        if (!cancelled) {
          callbacksRef.current.onLoading?.(false);
        }
      }
    };

    // =================================================
    // INITIALIZE AND RENDER GOOGLE BUTTON
    // =================================================

    const renderGoogleButton = () => {
      if (
        cancelled ||
        !buttonRef.current ||
        !window.google?.accounts?.id
      ) {
        return;
      }

      buttonRef.current.replaceChildren();

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
        ux_mode: "popup",
      });

      window.google.accounts.id.renderButton(
        buttonRef.current,
        {
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          logo_alignment: "left",
          width: 380,
        }
      );
    };

    // =================================================
    // GOOGLE SDK ALREADY LOADED
    // =================================================

    if (window.google?.accounts?.id) {
      renderGoogleButton();

      return () => {
        cancelled = true;
      };
    }

    // =================================================
    // LOAD GOOGLE IDENTITY SERVICES
    // =================================================

    let script = document.getElementById(
      "google-identity-services"
    );

    const handleScriptLoad = () => {
      renderGoogleButton();
    };

    const handleScriptError = () => {
      if (cancelled) return;

      console.error(
        "ABS CUT: Google Identity Services failed to load."
      );

      reportError(
        "Unable to load Google login. Please try again."
      );
    };

    if (!script) {
      script = document.createElement("script");

      script.id = "google-identity-services";
      script.src =
        "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;

      script.addEventListener(
        "load",
        handleScriptLoad
      );

      script.addEventListener(
        "error",
        handleScriptError
      );

      document.head.appendChild(script);
    } else {
      script.addEventListener(
        "load",
        handleScriptLoad
      );

      script.addEventListener(
        "error",
        handleScriptError
      );
    }

    return () => {
      cancelled = true;

      script?.removeEventListener(
        "load",
        handleScriptLoad
      );

      script?.removeEventListener(
        "error",
        handleScriptError
      );

      if (buttonRef.current) {
        buttonRef.current.replaceChildren();
      }
    };
  }, []);

  return (
    <div className="google-login-button-wrapper">
      <div
        ref={buttonRef}
        className="google-login-button"
      />
    </div>
  );
}

export default GoogleLoginButton;
