import { useState, useEffect } from "react";

export function useRecipes(initialRecipes: any[]) {
  // On commence avec les recettes par défaut
  const [recipes, setRecipes] = useState(initialRecipes);

  // On charge les données du navigateur seulement APRES le premier affichage
  useEffect(() => {
    const saved = localStorage.getItem("brew_recipes");
    if (saved) {
      setRecipes(JSON.parse(saved));
    }
  }, []);

  // On sauvegarde à chaque modification
  useEffect(() => {
    if (recipes.length > 0 || localStorage.getItem("brew_recipes")) {
      localStorage.setItem("brew_recipes", JSON.stringify(recipes));
    }
  }, [recipes]);

  const addRecipe = (newRecipe: any) => {
    setRecipes((prev) => [...prev, newRecipe]);
  };

  const deleteRecipe = (name: string) => {
    setRecipes((prev) => prev.filter((r) => r.name !== name));
  };

  return { recipes, addRecipe, deleteRecipe };
}