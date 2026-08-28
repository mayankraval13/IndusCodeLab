import axios from 'axios';

export const axiosInstance = axios.create({
    baseURL: import.meta.env.MODE === 'development' ? 'http://localhost:8000/api/v1' : "/api/v1",
    withCredentials: true,
});

// Registered by the auth store rather than imported from it, to keep this
// module free of a circular dependency.
let onPasswordChangeRequired = null;

export const setPasswordChangeRequiredHandler = (handler) => {
    onPasswordChangeRequired = handler;
};

axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (
            error.response?.status === 403 &&
            error.response?.data?.code === "PASSWORD_CHANGE_REQUIRED"
        ) {
            onPasswordChangeRequired?.();
        }
        return Promise.reject(error);
    }
);
