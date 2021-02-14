const express = require('express');
const axios = require('axios')
const app = express();
const port = 3300;
const redis = require('redis')
// make a connection to the local instance of redis
const client = redis.createClient(6379)


app.set('view engine', 'ejs')

app.use(express.urlencoded({ extended: false }))

client.on("error", (error) => {
  console.error(error)
})


app.get('/', (req, res) => {
  res.render('index', { data: [] })
})

app.post('/recipes', async (req, res) => {

  try {
    // const foodItem = req.params.fooditem;
    const foodItem = req.body.recipeName;

    console.log(foodItem);
    // Check the redis store for the data first
    client.get(foodItem, async (err, recipe) => {
      if (recipe) {
        const recipes = JSON.parse(recipe);
        res.render('index', {name: foodItem, data: recipes })

      } else {

        // When the data is not found in the cache then we can make request to the server

        const recipeNew = await axios.get(`http://www.recipepuppy.com/api/?q=${foodItem}`);

        // save the record in the cache for subsequent request
        client.setex(foodItem, 1440, JSON.stringify(recipeNew.data.results));

        const recipes = JSON.parse(recipeNew.data.results);
        res.render('index', {name: foodItem, data: recipes })

      }
    })
  } catch (error) {
    console.log(error)
  }
});


//test for postman
app.get('/recipe/:fooditem', async (req, res) => {

  try {
    const foodItem = req.params.fooditem;


    // Check the redis store for the data first
    client.get(foodItem, async (err, recipe) => {
      if (recipe) {
        return res.status(200).send({
          error: false,
          message: `Recipe for ${foodItem} from the cache`,
          data: JSON.parse(recipe)
        })
      } else { 
          // When the data is not found in the cache then we can make request to the server

        const recipe = await axios.get(`http://www.recipepuppy.com/api/?q=${foodItem}`);

        // save the record in the cache for subsequent request
        client.setex(foodItem, 1440, JSON.stringify(recipe.data.results));

        // return the result to the client
        return res.status(200).send({
          error: false,
          message: `Recipe for ${foodItem} from the server`,
          data: recipe.data.results
        });
      }
    })
  } catch (error) {
    console.log(error)
  }
});




app.listen(port, () => {
  console.log(`Server running on port ${port} - start redis server instance`);
});

module.exports = app;

