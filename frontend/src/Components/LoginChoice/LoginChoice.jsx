import React from "react";
import { useNavigate } from "react-router-dom";
import "./LoginChoice.css";

export const LoginChoice = () => {
  const navigate = useNavigate();

  const handleSellerLogin = () => {
     window.location.href = "http://localhost:5173/adminlogin";  // adjust route for your admin login
  };

  const handleBuyerLogin = () => {
    navigate("/login"); // adjust route for your user login
  };

  return (
    <div className="login-choice">
      <h1>LOGIN AS</h1>
      <div className="login-buttons">
        <button onClick={handleSellerLogin} className="seller-btn">
          Seller Login
        </button>
        <button onClick={handleBuyerLogin} className="buyer-btn">
          Buyer Login
        </button>
      </div>
    </div>
  );
};
