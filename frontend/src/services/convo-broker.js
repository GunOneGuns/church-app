import axios from "axios";

export const fetchPeople = async () => {
  const baseURL = "http://localhost:8080";
  try {
    const response = await axios.get(`${baseURL}/people`);
    const people = response.data;

    // Store users in localStorage
    if (!localStorage.getItem("people")) {
      localStorage.setItem("people", JSON.stringify(people));
    }
  } catch (error) {
    console.error("Failed to fetch users:", error);
  }
};
