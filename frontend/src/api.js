const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000/api";

export async function submitFeedback(feedback) {
  const res = await fetch(`${API_URL}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(feedback)
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({})); 
    throw new Error(errData.error || "Failed to submit feedback");
  }
  return res.json();
}

export async function getAllFeedbacks() {
  const res = await fetch(`${API_URL}/feedbacks`);
  if (!res.ok) throw new Error("Failed to fetch data");
  return res.json();
}

export async function verifyFeedback(feedback) {
  const res = await fetch(`${API_URL}/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      customer_name: feedback.customer_name,
      rating: feedback.rating,
      comment: feedback.comment,
      signature: feedback.signature,
      public_key: feedback.public_key,
      // 👉 THE CRITICAL FIX: Send the photo back to the server for mathematical verification!
      attachment: feedback.attachment 
    }),
  });
  
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || "Verification request failed");
  }
  
  return res.json();
}

// OUR MERGED PURGE FUNCTION
export async function deleteFeedback(id) {
  const res = await fetch(`${API_URL}/feedback/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete record");
  return res.json();
}

// 👉 ADD THIS TO src/api.js:
export async function quarantineFeedback(id) {
  const res = await fetch(`${API_URL}/feedback/${id}/quarantine`, {
    method: "PUT",
  });
  if (!res.ok) throw new Error("Failed to quarantine record");
  return res.json();
}