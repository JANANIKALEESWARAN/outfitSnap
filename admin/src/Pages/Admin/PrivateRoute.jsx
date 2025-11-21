import React from "react";
import { Navigate } from "react-router-dom";

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem("admin-auth-token");
  return token ? children : <Navigate to="/adminlogin" />;
};

export default PrivateRoute;
