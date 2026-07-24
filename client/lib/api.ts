import axios from "axios";

export const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (typeof window !== "undefined" && error.response) {
            const status = error.response.status;
            
            // Only redirect for specific structural/system errors.
            // 400 Bad Request, 404 Not Found, 409 Conflict are usually handled in-component for specific UX feedback.
            if (status === 401) {
                // If it's a login attempt failure, we don't want to redirect to the generic 401 page.
                // We only redirect if it's an unauthorized API call from an authenticated session.
                if (!error.config.url.includes("/login")) {
                    window.location.href = "/errors/401";
                }
            } else if (status === 403) {
                window.location.href = "/errors/403";
            } else if (status === 500) {
                window.location.href = "/errors/500";
            } else if (status === 503) {
                window.location.href = "/errors/503";
            }
        }
        return Promise.reject(error);
    }
);
