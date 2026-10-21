
import {
  useEffect,
  useRef,
  useState,
} from "react";

// =====================================================
// ABS CUT — FACEBOOK LOGIN BUTTON
// =====================================================

function FacebookLoginButton({
  onSuccess,
  onError,
  onLoadingChange,
}) {
  const [sdkReady, setSdkReady] = useState(false);
  const [loading, setLoading] = useState(true);

  const initializedRef = useRef(false);

  const callbacksRef = useRef({
    onSuccess,
    onError,
    onLoadingChange,
  });

  callbacksRef.current = {
    onSuccess,
    onError,
    onLoadingChange,
  };

  useEffect(() => {
    let cancelled = false;

    const appId =
      import.meta.env.VITE_FACEBOOK_APP_ID;

    const finishLoading = (value) => {
      if (cancelled) return;

      setLoading(value);
      callbacksRef.current.onLoadingChange?.(
        value
      );
    };

    const reportError = (message) => {
      callbacksRef.current.onError?.(message);
    };

    // =================================================
    // INITIALIZE FACEBOOK SDK
    // =================================================

    const initializeFacebook = () => {
      if (cancelled) return;

      if (!appId) {
        finishLoading(false);

        console.error(
          "ABS CUT: VITE_FACEBOOK_APP_ID is missing."
        );

        reportError(
          "Facebook login is not configured."
        );

        return;
      }

      if (!window.FB) {
        finishLoading(false);

        reportError(
          "Facebook login could not be initialized."
        );

        return;
      }

      try {
        if (!initializedRef.current) {
          window.FB.init({
            appId,
            cookie: true,
            xfbml: false,
            version: "v26.0",
          });

          initializedRef.current = true;
        }

        setSdkReady(true);
        finishLoading(false);
      } catch (error) {
        console.error(
          "ABS CUT Facebook SDK initialization error:",
          error
        );

        finishLoading(false);

        reportError(
          "Unable to initialize Facebook login."
        );
      }
    };

    // =================================================
    // FACEBOOK SDK ALREADY AVAILABLE
    // =================================================

    if (window.FB) {
      initializeFacebook();

      return () => {
        cancelled = true;
      };
    }

    // =================================================
    // LOAD FACEBOOK SDK
    // =================================================

    window.fbAsyncInit = initializeFacebook;

    let script = document.getElementById(
      "facebook-jssdk"
    );

    const handleScriptLoad = () => {
      initializeFacebook();
    };

    const handleScriptError = () => {
      if (cancelled) return;

      finishLoading(false);

      console.error(
        "ABS CUT: Facebook SDK failed to load."
      );

      reportError(
        "Unable to load Facebook login. Please try again."
      );
    };

    if (!script) {
      script = document.createElement("script");

      script.id = "facebook-jssdk";
      script.src =
        "https://connect.facebook.net/en_US/sdk.js";
      script.async = true;
      script.defer = true;
      script.crossOrigin = "anonymous";
    }

    script.addEventListener(
      "load",
      handleScriptLoad
    );

    script.addEventListener(
      "error",
      handleScriptError
    );

    if (!script.isConnected) {
      document.body.appendChild(script);
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

      // Do not remove the SDK script. Other renders
      // may reuse the SDK after this component unmounts.
    };
  }, []);

  // =====================================================
  // HANDLE FACEBOOK LOGIN
  // =====================================================

  const handleFacebookLogin = () => {
    if (!sdkReady || !window.FB) {
      callbacksRef.current.onError?.(
        "Facebook login is not ready. Please try again."
      );

      return;
    }

    setLoading(true);

    callbacksRef.current.onLoadingChange?.(true);
    callbacksRef.current.onError?.("");

    // FB.login requires a normal callback function.
    window.FB.login(
      (response) => {
        const accessToken =
          response?.authResponse?.accessToken;

        if (!accessToken) {
          setLoading(false);

          callbacksRef.current.onLoadingChange?.(
            false
          );

          callbacksRef.current.onError?.(
            "Facebook login was cancelled or could not be completed."
          );

          return;
        }

        // Pass the access token to Login.jsx.
        // Login.jsx sends it to the ABS CUT backend.
        Promise.resolve()
          .then(() => {
            if (
              typeof callbacksRef.current.onSuccess !==
              "function"
            ) {
              throw new Error(
                "The Facebook login success handler is missing."
              );
            }

            return callbacksRef.current.onSuccess(
              accessToken
            );
          })
          .catch((error) => {
            console.error(
              "ABS CUT Facebook login error:",
              error
            );

            callbacksRef.current.onError?.(
              error.message ||
                "Unable to complete Facebook login."
            );
          })
          .finally(() => {
            setLoading(false);

            callbacksRef.current.onLoadingChange?.(
              false
            );
          });
      },
      {
        scope: "public_profile,email",
      }
    );
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <button
      type="button"
      className="facebook-login-button"
      onClick={handleFacebookLogin}
      disabled={loading || !sdkReady}
    >
      <span className="facebook-login-icon">
        f
      </span>

      <span>
        {loading
          ? "Loading Facebook..."
          : "Continue with Facebook"}
      </span>
    </button>
  );
}

export default FacebookLoginButton;




// import { useEffect, useRef, useState } from "react";

// function FacebookLoginButton({
//   onSuccess,
//   onError,
//   onLoadingChange,
// }) {
//   const initializedRef = useRef(false);
//   const [sdkReady, setSdkReady] = useState(false);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     let mounted = true;

//     const finishLoading = (value) => {
//       if (!mounted) return;

//       setLoading(value);

//       if (onLoadingChange) {
//         onLoadingChange(value);
//       }
//     };

//     const initializeFacebook = () => {
//       if (!window.FB) {
//         finishLoading(false);
//         return;
//       }

//       if (initializedRef.current) {
//         setSdkReady(true);
//         finishLoading(false);
//         return;
//       }

//       const appId = import.meta.env.VITE_FACEBOOK_APP_ID;

//       if (!appId) {
//         console.error(
//           "ABS CUT: VITE_FACEBOOK_APP_ID is missing."
//         );

//         finishLoading(false);

//         if (onError) {
//           onError(
//             "Facebook login is not configured correctly."
//           );
//         }

//         return;
//       }

//       try {
//         window.FB.init({
//           appId,
//           cookie: true,
//           xfbml: false,
//           version: "v26.0",
//         });

//         initializedRef.current = true;

//         setSdkReady(true);
//         finishLoading(false);
//       } catch (error) {
//         console.error(
//           "ABS CUT Facebook SDK initialization error:",
//           error
//         );

//         finishLoading(false);

//         if (onError) {
//           onError(
//             "Unable to initialize Facebook login."
//           );
//         }
//       }
//     };

//     if (window.FB) {
//       initializeFacebook();

//       return () => {
//         mounted = false;
//       };
//     }

//     const existingScript = document.getElementById(
//       "facebook-jssdk"
//     );

//     if (existingScript) {
//       existingScript.addEventListener(
//         "load",
//         initializeFacebook
//       );

//       return () => {
//         mounted = false;
//         existingScript.removeEventListener(
//           "load",
//           initializeFacebook
//         );
//       };
//     }

//     window.fbAsyncInit = initializeFacebook;

//     const script = document.createElement("script");

//     script.id = "facebook-jssdk";
//     script.src = "https://connect.facebook.net/en_US/sdk.js";
//     script.async = true;
//     script.defer = true;
//     script.crossOrigin = "anonymous";

//     script.onerror = () => {
//       finishLoading(false);

//       console.error(
//         "ABS CUT: Facebook SDK failed to load."
//       );

//       if (onError) {
//         onError(
//           "Facebook login could not be loaded."
//         );
//       }
//     };

//     document.body.appendChild(script);

//     return () => {
//       mounted = false;
//     };
//   }, [onError, onLoadingChange]);
  
//   const handleFacebookLogin = () => {
//   if (!sdkReady || !window.FB) {
//     if (onError) {
//       onError(
//         "Facebook login is not ready yet. Please try again."
//       );
//     }

//     return;
//   }

//   setLoading(true);

//   if (onLoadingChange) {
//     onLoadingChange(true);
//   }

//   window.FB.login(
//     (response) => {
//       if (!response?.authResponse?.accessToken) {
//         setLoading(false);

//         if (onLoadingChange) {
//           onLoadingChange(false);
//         }

//         if (onError) {
//           onError(
//             "Facebook login was cancelled or could not be completed."
//           );
//         }

//         return;
//       }

//       const accessToken =
//         response.authResponse.accessToken;

//       Promise.resolve(onSuccess(accessToken))
//         .catch((error) => {
//           console.error(
//             "ABS CUT Facebook login error:",
//             error
//           );

//           if (onError) {
//             onError(
//               error.message ||
//               "Unable to complete Facebook login."
//             );
//           }
//         })
//         .finally(() => {
//           setLoading(false);

//           if (onLoadingChange) {
//             onLoadingChange(false);
//           }
//         });
//     },
//     {
//       scope: "public_profile,email",
//       auth_type: "rerequest",
//     }
//   );
// };

//   // const handleFacebookLogin = () => {
//   //   if (!sdkReady || !window.FB) {
//   //     if (onError) {
//   //       onError(
//   //         "Facebook login is not ready yet. Please try again."
//   //       );
//   //     }

//   //     return;
//   //   }

//   //   setLoading(true);

//   //   if (onLoadingChange) {
//   //     onLoadingChange(true);
//   //   }

//   //   window.FB.login(
//   //     async (response) => {
//   //       try {
//   //         if (!response?.authResponse?.accessToken) {
//   //           setLoading(false);

//   //           if (onLoadingChange) {
//   //             onLoadingChange(false);
//   //           }

//   //           if (onError) {
//   //             onError(
//   //               "Facebook login was cancelled or could not be completed."
//   //             );
//   //           }

//   //           return;
//   //         }

//   //         const accessToken =
//   //           response.authResponse.accessToken;

//   //         await onSuccess(accessToken);
//   //       } catch (error) {
//   //         console.error(
//   //           "ABS CUT Facebook login error:",
//   //           error
//   //         );

//   //         if (onError) {
//   //           onError(
//   //             error.message ||
//   //             "Unable to complete Facebook login."
//   //           );
//   //         }
//   //       } finally {
//   //         setLoading(false);

//   //         if (onLoadingChange) {
//   //           onLoadingChange(false);
//   //         }
//   //       }
//   //     },
//   //     {
//   //       scope: "public_profile,email",
//   //       auth_type: "rerequest",
//   //     }
//   //   );
//   // };

//   return (
//     <button
//       type="button"
//       className="facebook-login-button"
//       onClick={handleFacebookLogin}
//       disabled={loading || !sdkReady}
//     >
//       <span className="facebook-login-icon">
//         f
//       </span>

//       <span>
//         {loading
//           ? "Loading Facebook..."
//           : "Continue with Facebook"}
//       </span>
//     </button>
//   );
// }

// export default FacebookLoginButton;