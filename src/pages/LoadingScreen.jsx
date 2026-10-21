import "./LoadingScreen.css";

function LoadingScreen({
  message = "Loading ABS CUT..."
}) {
  return (
    <div className="abs-loading-screen">
      <div className="abs-loading-card">

        <div className="abs-loading-logo">
          <span>A</span>
          <span>B</span>
          <span>S</span>
        </div>

        <div className="abs-loading-spinner">
          <div className="abs-loading-spinner-inner"></div>
        </div>

        <div className="abs-loading-content">
          <h2>ABS CUT</h2>

          <p>{message}</p>

          <div className="abs-loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>

      </div>
    </div>
  );
}

export default LoadingScreen;