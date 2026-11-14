

const API_URL = import.meta.env.DEV
  ? "http://localhost:5000/api"
  
  :"https://abscut-server-nine.vercel.app/api"
/*
  =====================================================
  STANDARD API REQUEST
  =====================================================

  Used for JSON requests throughout ABS CUT.
*/


export async function apiRequest(
  endpoint,
  options = {},
) {
  const token =
    localStorage.getItem("absCutToken");

  try {
    const response = await fetch(
      `${API_URL}${endpoint}`,
      {
        ...options,

        headers: {
          "Content-Type":
            "application/json",

          ...(token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {}),

          ...(options.headers || {}),
        },
      },
    );

    /*
     * =================================================
     * READ RESPONSE SAFELY
     * =================================================
     */

    const contentType =
      response.headers.get(
        "content-type",
      ) || "";

    let data;

    if (
      contentType.includes(
        "application/json",
      )
    ) {
      data = await response.json();
    } else {
      const text =
        await response.text();

      console.error(
        "NON-JSON API RESPONSE:",
        {
          status: response.status,
          statusText: response.statusText,
          endpoint,
          response: text,
        },
      );

      throw new Error(
        `The server returned an unexpected response (${response.status}).`,
      );
    }

    /*
     * =================================================
     * HANDLE API ERRORS
     * =================================================
     */

 
  if (!response.ok) {
  const error = new Error(
    data?.message || "Something went wrong."
  );

  error.status = response.status;
  error.requiresEmailVerification =
    data?.requiresEmailVerification === true;
  error.email = data?.email;

  throw error;
}

    return data;

    } catch (error) {
    console.error("API REQUEST ERROR:", {
      endpoint,
      status: error?.status,
      message: error?.message,
      error,
    });

    // Preserve the original error and its custom properties.
    throw error instanceof Error
      ? error
      : new Error(
          "Unable to connect to the ABS CUT server."
        );
  }
}


export async function uploadRequest(
  endpoint,
  formData,
) {
  const token =
    localStorage.getItem("absCutToken");

  try {
    const response = await fetch(
      `${API_URL}${endpoint}`,
      {
        method: "POST",

        headers: {
          ...(token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {}),
        },

        body: formData,
      },
    );

    /*
     * =================================================
     * READ RESPONSE SAFELY
     * =================================================
     */

    const contentType =
      response.headers.get(
        "content-type",
      ) || "";

    let data;

    if (
      contentType.includes(
        "application/json",
      )
    ) {
      data = await response.json();
    } else {
      const text =
        await response.text();

      console.error(
        "NON-JSON UPLOAD RESPONSE:",
        {
          status: response.status,
          statusText: response.statusText,
          endpoint,
          response: text,
        },
      );

      throw new Error(
        `The upload server returned an unexpected response (${response.status}).`,
      );
    }

    /*
     * =================================================
     * HANDLE UPLOAD ERRORS
     * =================================================
     */

    if (!response.ok) {
      throw new Error(
        data?.message ||
          "Unable to upload file.",
      );
    }

    return data;
  } catch (error) {
    console.error(
      "UPLOAD REQUEST ERROR:",
      {
        endpoint,
        error,
      },
    );

    throw new Error(
      error?.message ||
        "Unable to connect to the ABS CUT server.",
    );
  }
}


/*
  =====================================================
  UPLOAD REQUEST WITH PROGRESS
  =====================================================

  Used for large file uploads that need live progress,
  such as ABS CUT Academy lesson videos.

  Do NOT manually set Content-Type.
  XMLHttpRequest creates the multipart boundary.
*/

export function uploadRequestWithProgress(
  endpoint,
  formData,
  onProgress = () => {},
) {
  return new Promise((resolve, reject) => {
    const token = localStorage.getItem("absCutToken");

    const xhr = new XMLHttpRequest();

    xhr.open("POST", `${API_URL}${endpoint}`);

    if (token) {
      xhr.setRequestHeader(
        "Authorization",
        `Bearer ${token}`,
      );
    }

    // LIVE UPLOAD PROGRESS
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        const percentage = Math.round(
          (event.loaded / event.total) * 100,
        );

        onProgress(percentage);
      }
    });

    // SUCCESS / SERVER RESPONSE
    xhr.addEventListener("load", () => {
      let data;

      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        reject(
          new Error(
            `The upload server returned an unexpected response (${xhr.status}).`,
          ),
        );
        return;
      }

      if (xhr.status < 200 || xhr.status >= 300) {
        const error = new Error(
          data?.message || "Unable to upload file.",
        );

        error.status = xhr.status;

        reject(error);
        return;
      }

      resolve(data);
    });

    // NETWORK ERROR
    xhr.addEventListener("error", () => {
      reject(
        new Error(
          "Unable to connect to the ABS CUT server.",
        ),
      );
    });

    // UPLOAD CANCELLED
    xhr.addEventListener("abort", () => {
      reject(
        new Error("The upload was cancelled."),
      );
    });

    xhr.send(formData);
  });
}
