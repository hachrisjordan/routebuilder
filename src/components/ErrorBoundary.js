class RouteSearchErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <h2>Route Search Error</h2>
          <p>Unable to find routes. Please try again later.</p>
        </div>
      );
    }
    return this.props.children;
  }
} 