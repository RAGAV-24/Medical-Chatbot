import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const FitbitCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const getAccessToken = async () => {
      const token = localStorage.getItem("fitbit_access_token");
      if (token) {
        navigate("/dashboard");
        return;
      }

      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");

      if (!code) return;

      const CLIENT_ID = import.meta.env.VITE_FITBIT_CLIENT_ID;
      const CLIENT_SECRET = import.meta.env.VITE_FITBIT_CLIENT_SECRET;
      const REDIRECT_URI = import.meta.env.VITE_FITBIT_REDIRECT_URI;

      const tokenUrl = "https://api.fitbit.com/oauth2/token";
      const authHeader = `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`;

      try {
        const response = await axios.post(
          tokenUrl,
          new URLSearchParams({
            client_id: CLIENT_ID,
            grant_type: "authorization_code",
            redirect_uri: REDIRECT_URI,
            code: code,
          }),
          {
            headers: {
              Authorization: authHeader,
              "Content-Type": "application/x-www-form-urlencoded",
            },
          }
        );

        localStorage.setItem("fitbit_access_token", response.data.access_token);
        navigate("/dashboard"); // Redirect to your main app
      } catch (error) {
        console.error("Error getting Fitbit access token:", error);
      }
    };

    getAccessToken();
  }, [navigate]);

  return <h3>Processing Fitbit Login...</h3>;
};

export default FitbitCallback;
