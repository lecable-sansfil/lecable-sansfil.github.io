Jekyll::Hooks.register :site, :post_write do |site|
  puts "Génération terminée, lancement de la minification..."
  system("npm run build:min")
end
