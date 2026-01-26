import axios from "axios";

const baseURL = process.env.REACT_APP_API_URL || "http://localhost:8080";

export const fetchPeopleStats = async () => {
  const response = await axios.get(`${baseURL}/people/stats`, {
    params: { _ts: Date.now() },
    headers: {
      "Cache-Control": "no-cache",
    },
  });
  return response.data;
};

export const fetchPeople = async () => {
  try {
    const response = await axios.get(`${baseURL}/people`, {
      params: { _ts: Date.now() },
      headers: {
        "Cache-Control": "no-cache",
      },
    });
    const people = response.data;
    localStorage.setItem("people", JSON.stringify(people));
  } catch (error) {
    console.error("Failed to fetch users:", error);
  }
};

export const createPerson = async (personData) => {
  const response = await fetch(`${baseURL}/people`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(personData),
  });
  return response.json();
};

export const updatePerson = async (id, personData) => {
  try {
    const response = await axios.put(`${baseURL}/people/${id}`, personData);
    return response.data;
  } catch (error) {
    console.error("Failed to update person:", error);
    throw error;
  }
};

export const deletePerson = async (id) => {
  const response = await fetch(`${baseURL}/people/${id}`, {
    method: "DELETE",
  });
  return response.json();
};

export const uploadProfilePicture = async (personId, file) => {
  const formData = new FormData();
  formData.append("ProfilePic", file);

  try {
    const response = await axios.post(
      `${baseURL}/people/${personId}/upload-profile-pic`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data", // axios handles this correctly for FormData
        },
      }
    );
    return response.data; // This should contain profilePicUrl
  } catch (error) {
    console.error("Failed to upload profile picture:", error);
    throw error;
  }
};

export const fetchGroups = async () => {
  try {
    const response = await axios.get(`${baseURL}/groups`, {
      params: { _ts: Date.now() },
      headers: {
        "Cache-Control": "no-cache",
      },
    });
    const groups = response.data;
    localStorage.setItem("groups", JSON.stringify(groups));
    return groups;
  } catch (error) {
    console.error("Failed to fetch groups:", error);
    return [];
  }
};

export const fetchGroup = async (groupId) => {
  const response = await axios.get(`${baseURL}/groups/${groupId}`, {
    params: { _ts: Date.now() },
    headers: {
      "Cache-Control": "no-cache",
    },
  });
  return response.data;
};

export const createGroup = async (groupData) => {
  const response = await axios.post(`${baseURL}/groups`, groupData, {
    headers: { "Content-Type": "application/json" },
  });
  return response.data;
};

export const updateGroup = async (groupId, groupData) => {
  const response = await axios.put(`${baseURL}/groups/${groupId}`, groupData, {
    headers: { "Content-Type": "application/json" },
  });
  return response.data;
};

export const deleteGroup = async (groupId) => {
  const response = await axios.delete(`${baseURL}/groups/${groupId}`);
  return response.data;
};

export const uploadGroupPicture = async (groupId, file) => {
  const formData = new FormData();
  formData.append("GroupPic", file);

  const response = await axios.post(
    `${baseURL}/groups/${groupId}/upload-group-pic`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return response.data;
};
