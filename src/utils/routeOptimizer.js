const optimizeRouteSearch = (routes, maxResults = 1000) => {
  const seen = new Set();
  const optimizedRoutes = [];
  
  for (const route of routes) {
    const key = getRouteKey(route);
    if (seen.has(key)) continue;
    
    seen.add(key);
    optimizedRoutes.push(route);
    
    if (optimizedRoutes.length >= maxResults) break;
  }
  
  return optimizedRoutes;
}; 