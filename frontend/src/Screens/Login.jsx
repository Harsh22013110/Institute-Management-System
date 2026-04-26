import React, { useState, useEffect } from "react";
import { FiLogIn } from "react-icons/fi";
import { GiGraduateCap, GiBookCover, GiScrollUnfurled, GiDiploma, GiNotebook, GiCertificate } from "react-icons/gi";
import { FaGraduationCap, FaBook, FaFileAlt } from "react-icons/fa";
import axios from "axios";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import { setUserToken } from "../redux/actions";
import { useDispatch } from "react-redux";
import CustomButton from "../components/CustomButton";
import axiosWrapper from "../utils/AxiosWrapper";
const USER_TYPES = {
  STUDENT: "Student",
  FACULTY: "Faculty",
  ADMIN: "Admin",
};

const LoginForm = ({ selected, onSubmit, formData, setFormData }) => {
  const [ripples, setRipples] = useState([]);

  const createRipple = (event) => {
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    const newRipple = {
      id: Date.now(),
      x,
      y,
      size,
    };
    
    setRipples((prev) => [...prev, newRipple]);
    
    setTimeout(() => {
      setRipples((prev) => prev.filter((ripple) => ripple.id !== newRipple.id));
    }, 600);
  };

  return (
    <form
      className="w-full p-10 bg-white/98 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/50 relative overflow-hidden"
      onSubmit={onSubmit}
    >
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-[0.02] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAzNGMwIDMuMzE0LTIuNjg2IDYtNiA2cy02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiA2IDIuNjg2IDYgNnoiIGZpbGw9IiMwMDAiLz48L2c+PC9zdmc+')]"></div>
      
      {/* Professional accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-700"></div>
      
      <div className="mb-7">
        <label
          className="block text-white text-sm font-bold mb-3 tracking-wide uppercase text-xs"
          htmlFor="email"
        >
          {selected} Email Address
        </label>
        <div className="relative">
          <input
            type="email"
            id="email"
            required
            className="w-full px-5 py-3.5 text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all duration-300 bg-white hover:bg-white hover:border-gray-300 font-medium text-gray-900 placeholder-gray-600"
            placeholder="Enter your email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>
      </div>
      <div className="mb-7">
        <label
          className="block text-white text-sm font-bold mb-3 tracking-wide uppercase text-xs"
          htmlFor="password"
        >
          Password
        </label>
        <div className="relative">
          <input
            type="password"
            id="password"
            required
            className="w-full px-5 py-3.5 text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all duration-300 bg-white hover:bg-white hover:border-gray-300 font-medium text-gray-900 placeholder-gray-600"
            placeholder="Enter your password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />
        </div>
      </div>
      <div className="flex items-center justify-between mb-8">
        <Link
          className="text-sm text-white font-medium hover:text-blue-200 hover:underline transition-colors duration-200"
          to="/forget-password"
        >
          Forgot Password?
        </Link>
      </div>
      <button
        type="submit"
        onClick={createRipple}
        className="relative w-full bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 hover:from-blue-800 hover:via-indigo-800 hover:to-blue-900 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 flex justify-center items-center gap-2 overflow-hidden shadow-lg hover:shadow-2xl transform hover:scale-[1.01] active:scale-[0.99] text-base tracking-wide"
      >
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="absolute rounded-full bg-white/30 pointer-events-none"
            style={{
              left: `${ripple.x}px`,
              top: `${ripple.y}px`,
              width: `${ripple.size}px`,
              height: `${ripple.size}px`,
              animation: 'ripple 0.6s ease-out',
            }}
          />
        ))}
        <span className="relative z-10 flex items-center gap-2">
          Login
          <FiLogIn className="text-lg" />
        </span>
      </button>
    </form>
  );
};

const UserTypeSelector = ({ selected, onSelect }) => {
  const [ripples, setRipples] = useState({});

  const createRipple = (event, type) => {
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    const newRipple = {
      id: Date.now(),
      x,
      y,
      size,
    };
    
    setRipples((prev) => ({ ...prev, [type]: newRipple }));
    
    setTimeout(() => {
      setRipples((prev) => {
        const updated = { ...prev };
        delete updated[type];
        return updated;
      });
    }, 600);
  };

  return (
    <div className="flex justify-center gap-3 mb-10 bg-gray-50/80 p-2 rounded-2xl backdrop-blur-sm border border-gray-200/50">
      {Object.values(USER_TYPES).map((type) => (
        <button
          key={type}
          onClick={(e) => {
            createRipple(e, type);
            onSelect(type);
          }}
          className={`relative px-6 py-3 text-sm font-bold rounded-xl transition-all duration-300 overflow-hidden ${
            selected === type
              ? "bg-gradient-to-r from-blue-700 to-indigo-700 text-white shadow-lg shadow-blue-700/30 transform scale-105"
              : "bg-white text-gray-700 hover:bg-gray-100 hover:shadow-md font-semibold"
          }`}
        >
          {ripples[type] && (
            <span
              className="absolute rounded-full bg-white/40 pointer-events-none"
              style={{
                left: `${ripples[type].x}px`,
                top: `${ripples[type].y}px`,
                width: `${ripples[type].size}px`,
                height: `${ripples[type].size}px`,
                animation: 'ripple 0.6s ease-out',
              }}
            />
          )}
          <span className="relative z-10">{type}</span>
        </button>
      ))}
    </div>
  );
};

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const type = searchParams.get("type");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [selected, setSelected] = useState(USER_TYPES.STUDENT);

  const handleUserTypeSelect = (type) => {
    const userType = type.toLowerCase();
    setSelected(type);
    setSearchParams({ type: userType });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast.error("Please fill in all fields");
      return;
    }

    // Show loading toast
    const loadingToast = toast.loading("Logging in...");

    try {
      // axiosWrapper baseURL already includes /api, so we just need the endpoint
      const response = await axiosWrapper.post(
        `/${selected.toLowerCase()}/login`,
        formData
      );
      
      toast.dismiss(loadingToast);

      if (response.data.success && response.data.data) {
        const { token } = response.data.data;
        if (token) {
          localStorage.setItem("userToken", token);
          localStorage.setItem("userType", selected);
          dispatch(setUserToken(token));
          
          // Check for returnUrl and redirect there, otherwise go to default route
          const returnUrl = localStorage.getItem("returnUrl");
          if (returnUrl) {
            localStorage.removeItem("returnUrl");
            navigate(returnUrl);
          } else {
            navigate(`/${selected.toLowerCase()}`);
          }
        } else {
          toast.error("Token not received from server");
        }
      } else {
        toast.error(response.data.message || "Login failed");
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Login error:", error);
      
      let errorMessage = "Login failed. Please check your credentials.";
      
      if (!error.response) {
        // Network error - no response from server
        if (error.code === "ECONNABORTED") {
          errorMessage = "Request timeout. Please check:\n1. Backend server is running on http://10.148.86.146:4000\n2. Network connection is stable\n3. Firewall allows connections";
        } else if (error.message === "Network Error" || error.code === "ERR_NETWORK") {
          errorMessage = "Cannot connect to server. Please check:\n1. Backend server is running on port 4000\n2. API URL is correct: http://10.148.86.146:4000/api\n3. CORS is configured correctly\n4. No firewall blocking the connection";
        } else {
          errorMessage = `Network error: ${error.message}\n\nPlease verify:\n- Backend server is running\n- API URL: ${process.env.REACT_APP_APILINK || "http://10.148.86.146:4000/api"}\n- Network connectivity`;
        }
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 404) {
        errorMessage = "Login endpoint not found. Please check the API configuration.";
      } else if (error.response?.status >= 500) {
        errorMessage = "Server error. Please try again later.";
      }
      
      toast.error(errorMessage, { duration: 5000 });
    }
  };

  useEffect(() => {
    const userToken = localStorage.getItem("userToken");
    if (userToken) {
      // Check for returnUrl first, otherwise go to default route
      const returnUrl = localStorage.getItem("returnUrl");
      if (returnUrl) {
        localStorage.removeItem("returnUrl");
        navigate(returnUrl);
      } else {
        const userType = localStorage.getItem("userType");
        if (userType) {
          navigate(`/${userType.toLowerCase()}`);
        }
      }
    }
  }, [navigate]);

  useEffect(() => {
    if (type) {
      const capitalizedType = type.charAt(0).toUpperCase() + type.slice(1);
      setSelected(capitalizedType);
    }
  }, [type]);

  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden animated-bg"
    >
      {/* Professional gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900"></div>
      
      {/* Subtle college image overlay */}
      <div 
        className="absolute inset-0 bg-image-animated opacity-10"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1920&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "grayscale(100%) brightness(0.3)"
        }}
      ></div>
      
      {/* Professional overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-blue-900/70 to-indigo-900/80"></div>
      
      {/* Floating animated orbs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="floating-orb orb-1"></div>
        <div className="floating-orb orb-2"></div>
        <div className="floating-orb orb-3"></div>
        <div className="floating-orb orb-4"></div>
        <div className="floating-orb orb-5"></div>
      </div>
      
      {/* Animated geometric shapes */}
      <div className="absolute inset-0 geometric-shapes pointer-events-none">
        {/* Animated circles */}
        {[...Array(12)].map((_, i) => (
          <div 
            key={`circle-${i}`} 
            className="geometric-shape circle-shape"
            style={{
              left: `${(i * 8) % 100}%`,
              top: `${(i * 7) % 100}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${8 + (i % 4) * 2}s`
            }}
          ></div>
        ))}
        
        {/* Animated squares */}
        {[...Array(8)].map((_, i) => (
          <div 
            key={`square-${i}`} 
            className="geometric-shape square-shape"
            style={{
              left: `${(i * 12) % 100}%`,
              top: `${(i * 15) % 100}%`,
              animationDelay: `${i * 0.7}s`,
              animationDuration: `${10 + (i % 3) * 2}s`
            }}
          ></div>
        ))}
        
        {/* Animated triangles */}
        {[...Array(6)].map((_, i) => (
          <div 
            key={`triangle-${i}`} 
            className="geometric-shape triangle-shape"
            style={{
              left: `${(i * 16) % 100}%`,
              top: `${(i * 20) % 100}%`,
              animationDelay: `${i * 0.9}s`,
              animationDuration: `${12 + (i % 2) * 3}s`
            }}
          ></div>
        ))}
      </div>
      
      {/* Flowing wave patterns */}
      <div className="absolute inset-0 waves-container pointer-events-none">
        <svg className="wave-svg wave-1" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M0,60 Q300,20 600,60 T1200,60 L1200,120 L0,120 Z" fill="rgba(255,255,255,0.05)"></path>
        </svg>
        <svg className="wave-svg wave-2" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M0,60 Q300,100 600,60 T1200,60 L1200,120 L0,120 Z" fill="rgba(59,130,246,0.08)"></path>
        </svg>
        <svg className="wave-svg wave-3" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M0,80 Q400,40 800,80 T1200,80 L1200,120 L0,120 Z" fill="rgba(96,165,250,0.06)"></path>
        </svg>
      </div>
      
      {/* Animated grid pattern */}
      <div className="absolute inset-0 grid-pattern"></div>
      
      {/* Floating light beams */}
      <div className="absolute inset-0 light-beams pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <div 
            key={`beam-${i}`}
            className="light-beam"
            style={{
              left: `${20 + i * 15}%`,
              animationDelay: `${i * 1.2}s`,
              animationDuration: `${6 + i * 0.5}s`
            }}
          ></div>
        ))}
      </div>
      
      {/* College-themed floating elements */}
      <div className="absolute inset-0 college-elements-container pointer-events-none">
        {/* Graduation Caps */}
        {[...Array(8)].map((_, i) => (
          <div 
            key={`cap-${i}`} 
            className="college-element graduation-cap"
            style={{
              left: `${10 + (i * 12)}%`,
              animationDelay: `${i * 0.8}s`,
              animationDuration: `${15 + (i % 3) * 5}s`
            }}
          >
            <GiGraduateCap className="text-white/30" size={40 + (i % 3) * 10} />
          </div>
        ))}
        
        {/* Books */}
        {[...Array(6)].map((_, i) => (
          <div 
            key={`book-${i}`} 
            className="college-element book"
            style={{
              left: `${15 + (i * 14)}%`,
              animationDelay: `${i * 1.2}s`,
              animationDuration: `${18 + (i % 2) * 4}s`
            }}
          >
            <GiBookCover className="text-white/25" size={35 + (i % 2) * 8} />
          </div>
        ))}
        
        {/* Papers/Documents */}
        {[...Array(10)].map((_, i) => (
          <div 
            key={`paper-${i}`} 
            className="college-element paper"
            style={{
              left: `${5 + (i * 9)}%`,
              animationDelay: `${i * 0.6}s`,
              animationDuration: `${12 + (i % 4) * 3}s`
            }}
          >
            <FaFileAlt className="text-white/20" size={30 + (i % 3) * 5} />
          </div>
        ))}
        
        {/* Certificates/Diplomas */}
        {[...Array(5)].map((_, i) => (
          <div 
            key={`cert-${i}`} 
            className="college-element certificate"
            style={{
              left: `${20 + (i * 15)}%`,
              animationDelay: `${i * 1.5}s`,
              animationDuration: `${20 + (i % 2) * 6}s`
            }}
          >
            <GiDiploma className="text-white/25" size={45 + (i % 2) * 10} />
          </div>
        ))}
        
        {/* Scrolls */}
        {[...Array(4)].map((_, i) => (
          <div 
            key={`scroll-${i}`} 
            className="college-element scroll"
            style={{
              left: `${25 + (i * 18)}%`,
              animationDelay: `${i * 2}s`,
              animationDuration: `${22 + (i % 3) * 5}s`
            }}
          >
            <GiScrollUnfurled className="text-white/20" size={40 + i * 5} />
          </div>
        ))}
        
        {/* Notebooks */}
        {[...Array(7)].map((_, i) => (
          <div 
            key={`notebook-${i}`} 
            className="college-element notebook"
            style={{
              left: `${8 + (i * 13)}%`,
              animationDelay: `${i * 1.1}s`,
              animationDuration: `${16 + (i % 3) * 4}s`
            }}
          >
            <GiNotebook className="text-white/22" size={32 + (i % 2) * 6} />
          </div>
        ))}
      </div>
      
      <div className="w-full max-w-2xl lg:w-1/2 px-6 py-12 relative z-10">
        {/* University Branding Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-2xl mb-6 transform hover:scale-105 transition-transform duration-300 ring-4 ring-white/20">
            <GiGraduateCap className="text-white" size={45} />
          </div>
          <h1 className="text-5xl font-extrabold text-white mb-3 tracking-tight drop-shadow-lg">
            Institute Management System
          </h1>
          <p className="text-xl text-blue-100 font-semibold mb-2">
            {selected} Portal
          </p>
          <div className="w-32 h-1.5 bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-400 mx-auto rounded-full shadow-lg"></div>
        </div>
        
        <UserTypeSelector selected={selected} onSelect={handleUserTypeSelect} />
        <LoginForm
          selected={selected}
          onSubmit={handleSubmit}
          formData={formData}
          setFormData={setFormData}
        />
        
        {/* Footer */}
        <div className="mt-10 text-center">
          <p className="text-sm text-blue-200/80 font-medium">
            Secure access to your academic resources
          </p>
          <p className="text-xs text-blue-300/60 mt-2">
            © 2024 Institute Management System. All rights reserved.
          </p>
        </div>
      </div>
      <Toaster position="bottom-center" />
      
      <style>{`
        .animated-bg {
          background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #312e81 100%);
        }
        
        .bg-image-animated {
          opacity: 0.1;
          animation: imageFloat 30s ease-in-out infinite;
        }
        
        .floating-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.15;
          animation: float 25s ease-in-out infinite;
        }
        
        .orb-1 {
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.3), rgba(30, 58, 138, 0.15));
          top: 10%;
          left: 10%;
          animation-delay: 0s;
        }
        
        .orb-2 {
          width: 350px;
          height: 350px;
          background: radial-gradient(circle, rgba(96, 165, 250, 0.25), rgba(59, 130, 246, 0.1));
          top: 60%;
          right: 15%;
          animation-delay: 2s;
        }
        
        .orb-3 {
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(79, 70, 229, 0.25), rgba(59, 130, 246, 0.1));
          bottom: 15%;
          left: 20%;
          animation-delay: 4s;
        }
        
        .orb-4 {
          width: 450px;
          height: 450px;
          background: radial-gradient(circle, rgba(96, 165, 250, 0.2), rgba(30, 58, 138, 0.1));
          top: 30%;
          right: 30%;
          animation-delay: 6s;
        }
        
        .orb-5 {
          width: 320px;
          height: 320px;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.25), rgba(79, 70, 229, 0.1));
          bottom: 25%;
          right: 10%;
          animation-delay: 8s;
        }
        
        .geometric-shapes {
          overflow: hidden;
        }
        
        .geometric-shape {
          position: absolute;
          opacity: 0.08;
          animation: geometricFloat ease-in-out infinite;
        }
        
        .circle-shape {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,0.3), rgba(59,130,246,0.2));
          border: 2px solid rgba(255,255,255,0.2);
        }
        
        .square-shape {
          width: 50px;
          height: 50px;
          background: linear-gradient(135deg, rgba(96,165,250,0.3), rgba(59,130,246,0.2));
          border: 2px solid rgba(255,255,255,0.15);
          transform: rotate(45deg);
        }
        
        .triangle-shape {
          width: 0;
          height: 0;
          border-left: 30px solid transparent;
          border-right: 30px solid transparent;
          border-bottom: 50px solid rgba(79,70,229,0.25);
        }
        
        @keyframes geometricFloat {
          0%, 100% {
            transform: translate(0, 0) rotate(0deg) scale(1);
            opacity: 0.15;
          }
          25% {
            transform: translate(30px, -30px) rotate(90deg) scale(1.2);
            opacity: 0.25;
          }
          50% {
            transform: translate(-20px, -60px) rotate(180deg) scale(0.8);
            opacity: 0.2;
          }
          75% {
            transform: translate(40px, -30px) rotate(270deg) scale(1.1);
            opacity: 0.22;
          }
        }
        
        .waves-container {
          overflow: hidden;
        }
        
        .wave-svg {
          position: absolute;
          width: 200%;
          height: 200px;
          bottom: 0;
          left: 0;
          animation: waveMove linear infinite;
        }
        
        .wave-1 {
          animation-duration: 20s;
          opacity: 0.6;
        }
        
        .wave-2 {
          animation-duration: 25s;
          animation-delay: -5s;
          opacity: 0.5;
        }
        
        .wave-3 {
          animation-duration: 30s;
          animation-delay: -10s;
          opacity: 0.4;
        }
        
        @keyframes waveMove {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        
        .grid-pattern {
          background-image: 
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 50px 50px;
          animation: gridMove 20s linear infinite;
          opacity: 0.5;
        }
        
        @keyframes gridMove {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: 50px 50px;
          }
        }
        
        .light-beams {
          overflow: hidden;
        }
        
        .light-beam {
          position: absolute;
          width: 2px;
          height: 100%;
          background: linear-gradient(
            to bottom,
            transparent,
            rgba(255,255,255,0.1),
            transparent
          );
          animation: beamSweep ease-in-out infinite;
          transform-origin: top;
        }
        
        @keyframes beamSweep {
          0%, 100% {
            transform: translateX(0) scaleY(0);
            opacity: 0;
          }
          50% {
            transform: translateX(0) scaleY(1);
            opacity: 0.6;
          }
        }
        
        @keyframes gradientShift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        
        @keyframes imageFloat {
          0%, 100% {
            transform: scale(1) translateY(0);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.1) translateY(-20px);
            opacity: 0.4;
          }
        }
        
        @keyframes overlayPulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          25% {
            transform: translate(50px, -50px) scale(1.1);
          }
          50% {
            transform: translate(-30px, -100px) scale(0.9);
          }
          75% {
            transform: translate(-50px, -30px) scale(1.05);
          }
        }
        
        .college-elements-container {
          overflow: hidden;
        }
        
        .college-element {
          position: absolute;
          bottom: -100px;
          animation: floatUp linear infinite;
          filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
        }
        
        .graduation-cap {
          animation-name: floatUpRotate;
        }
        
        .book {
          animation-name: floatUpSway;
        }
        
        .paper {
          animation-name: floatUpTumble;
        }
        
        .certificate {
          animation-name: floatUpSlow;
        }
        
        .scroll {
          animation-name: floatUpRotate;
        }
        
        .notebook {
          animation-name: floatUpSway;
        }
        
        @keyframes floatUp {
          0% {
            transform: translateY(0) translateX(0) rotate(0deg);
            opacity: 0;
          }
          5% {
            opacity: 0.8;
          }
          95% {
            opacity: 0.8;
          }
          100% {
            transform: translateY(-110vh) translateX(50px) rotate(10deg);
            opacity: 0;
          }
        }
        
        @keyframes floatUpRotate {
          0% {
            transform: translateY(0) translateX(0) rotate(0deg);
            opacity: 0;
          }
          5% {
            opacity: 0.7;
          }
          50% {
            transform: translateY(-50vh) translateX(30px) rotate(180deg);
          }
          95% {
            opacity: 0.7;
          }
          100% {
            transform: translateY(-110vh) translateX(-30px) rotate(360deg);
            opacity: 0;
          }
        }
        
        @keyframes floatUpSway {
          0% {
            transform: translateY(0) translateX(0) rotate(0deg);
            opacity: 0;
          }
          5% {
            opacity: 0.6;
          }
          25% {
            transform: translateY(-25vh) translateX(20px) rotate(-5deg);
          }
          50% {
            transform: translateY(-50vh) translateX(-20px) rotate(5deg);
          }
          75% {
            transform: translateY(-75vh) translateX(15px) rotate(-3deg);
          }
          95% {
            opacity: 0.6;
          }
          100% {
            transform: translateY(-110vh) translateX(-15px) rotate(0deg);
            opacity: 0;
          }
        }
        
        @keyframes floatUpTumble {
          0% {
            transform: translateY(0) translateX(0) rotate(0deg);
            opacity: 0;
          }
          5% {
            opacity: 0.5;
          }
          20% {
            transform: translateY(-20vh) translateX(10px) rotate(90deg);
          }
          40% {
            transform: translateY(-40vh) translateX(-10px) rotate(180deg);
          }
          60% {
            transform: translateY(-60vh) translateX(15px) rotate(270deg);
          }
          80% {
            transform: translateY(-80vh) translateX(-15px) rotate(360deg);
          }
          95% {
            opacity: 0.5;
          }
          100% {
            transform: translateY(-110vh) translateX(20px) rotate(450deg);
            opacity: 0;
          }
        }
        
        @keyframes floatUpSlow {
          0% {
            transform: translateY(0) translateX(0) scale(0.8);
            opacity: 0;
          }
          5% {
            opacity: 0.6;
          }
          50% {
            transform: translateY(-50vh) translateX(25px) scale(1);
          }
          95% {
            opacity: 0.6;
          }
          100% {
            transform: translateY(-110vh) translateX(-25px) scale(0.8);
            opacity: 0;
          }
        }
        
        @keyframes ripple {
          0% {
            transform: scale(0);
            opacity: 1;
          }
          100% {
            transform: scale(4);
            opacity: 0;
          }
        }
        
        @keyframes animate-gradient {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        
        .animate-gradient {
          background-size: 200% 200%;
          animation: animate-gradient 3s ease infinite;
        }
      `}</style>
    </div>
  );
};

export default Login;
