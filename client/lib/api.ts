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

            if (status === 400) {
                window.location.href = "/errors/400";
            } else if (status === 401) {
                if (!error.config.url.includes("/login") && !error.config.url.includes("/auth/me")) {
                    window.location.href = "/errors/401";
                }
            } else if (status === 403) {
                window.location.href = "/errors/403";
            } else if (status === 404) {
                window.location.href = "/not-found";
            } else if (status === 500) {
                window.location.href = "/errors/500";
            } else if (status === 503) {
                window.location.href = "/errors/503";
            }
        }
        return Promise.reject(error);
    }
);
