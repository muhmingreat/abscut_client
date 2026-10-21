
const API_URL = "http://localhost:5000/api" ;

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
      throw new Error(
        data?.message ||
          "Something went wrong.",
      );
    }

    return data;
  } catch (error) {
    console.error(
      "API REQUEST ERROR:",
      {
        endpoint,
        error,
      },
    );

    /*
     * Preserve the backend/API error message.
     */

    throw new Error(
      error?.message ||
        "Unable to connect to the ABS CUT server.",
    );
  }
}


/*
  =====================================================
  UPLOAD REQUEST
  =====================================================

  Used for images/files.

  IMPORTANT:
  Do NOT manually set Content-Type here.
  The browser automatically creates the
  correct multipart/form-data boundary.
*/

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
