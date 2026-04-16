const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

// --- IDENTITY & AUTHENTICATION ---

export const loginUser = async (credentials) => {
    const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
    }
    return response.json();
};

export const registerUser = async (userData) => {
    const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
    }
    return response.json();
};

// --- SECURE FEEDBACK ---

export const submitFeedback = async (payload) => {
    const token = localStorage.getItem('ua_token');

    const response = await fetch(`${API_URL}/feedback`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '' 
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit feedback');
    }
    return response.json();
};

// --- STALL MANAGEMENT ---

export const fetchStalls = async () => {
    const response = await fetch(`${API_URL}/stalls`);
    if (!response.ok) throw new Error('Failed to fetch stalls');
    return response.json();
};

export const addStall = async (name, image) => {
    const response = await fetch(`${API_URL}/stalls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, image })
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to add stall');
    }
    return response.json();
};

export const editStall = async (id, name, image) => {
    const response = await fetch(`${API_URL}/stalls/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, image })
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to edit stall');
    }
    return response.json();
};

export const deleteStall = async (id) => {
    const response = await fetch(`${API_URL}/stalls/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete stall');
    return response.json();
};

// --- ADMIN ROUTES ---

export const getAllFeedbacks = async () => {
    const response = await fetch(`${API_URL}/feedbacks`);
    return response.json();
};

export const getFeedbackPhoto = async (id) => {
    const response = await fetch(`${API_URL}/feedback/${id}/photo`);
    if (!response.ok) return null;
    return response.json();
};

export const verifyFeedback = async (data) => {
    const response = await fetch(`${API_URL}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return response.json();
};

export const deleteFeedback = async (id) => {
    const response = await fetch(`${API_URL}/feedback/${id}`, { method: 'DELETE' });
    return response.json();
};

export const quarantineFeedback = async (id) => {
    const response = await fetch(`${API_URL}/feedback/${id}/quarantine`, { method: 'PUT' });
    return response.json();
};

// --- HACKER SIMULATION ROUTES ---

export const getLightFeedbacks = async () => {
    const response = await fetch(`${API_URL}/feedbacks/light`);
    if (!response.ok) {
        throw new Error('Failed to fetch light feedbacks');
    }
    return response.json();
};

export const tamperFeedback = async (id, rating, comment) => {
    const response = await fetch(`${API_URL}/hack/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment })
    });
    if (!response.ok) {
        throw new Error('Failed to hack feedback');
    }
    return response.json();
};