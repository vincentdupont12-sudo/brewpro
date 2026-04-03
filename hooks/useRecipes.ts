import { useState, useEffect } from "react";

export function useRecipes(initialRecipes: any[]) {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("brew_recipes");
    const parsed = saved ? JSON.parse(saved) : [];

    // Si le téléphone n'a pas de recettes ou une seule, on injecte les 5 de démo
    if (!parsed || parsed.length <= 1) {
      setRecipes(initialRecipes);
    } else {
      setRecipes(parsed);
    }
    setIsLoaded(true);
  }, [initialRecipes]);

  useEffect(() => {
    if (isLoaded && recipes.length > 0) {
      localStorage.setItem("brew_recipes", JSON.stringify(recipes));
    }
  }, [recipes, isLoaded]);

  const addRecipe = (newRecipe: any) => {
    setRecipes((prev) => [newRecipe, ...prev]);
  };

  const deleteRecipe = (name: string) => {
    setRecipes((prev) => prev.filter((r) => r.name !== name));
  };

  return { recipes, addRecipe, deleteRecipe };
}