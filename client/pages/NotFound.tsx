import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-center max-w-md">
        {/* Animated 404 Illustration */}
        <div className="mb-8 flex justify-center">
          <div className="relative w-48 h-48">
            <img
              src="https://media.giphy.com/media/Y1ggulGaIXJkSS7cs8/giphy.gif"
              alt="404 Not Found Animation"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Error Text */}
        <h1 className="text-6xl font-extrabold text-[#1D2054] mb-2">404</h1>
        <p className="text-2xl font-bold text-slate-700 mb-2">Page Not Found</p>
        <p className="text-lg text-muted-foreground mb-8">
          Sorry, we couldn't find the page you're looking for.
        </p>

        {/* Return Home Button */}
        <Link
          to="/"
          className="inline-block bg-[#1D2054] hover:bg-[#1D2054]/90 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
