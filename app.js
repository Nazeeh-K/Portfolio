require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require('mongoose');
const ejs = require('ejs');
const https = require("https");
const path = require("path");

const app = express();
const port = 3000;
console.log(process.env.API_KEY);

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(path.resolve("public")));
app.use("/jquery", express.static(__dirname + "node_modules/jquery/dist/"));

// connect DB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("DB connected");
  })
  .catch((err) => {
    console.log(`Error:: ${err}`);
  });

// Journal define and bind
const journalSchema = new mongoose.Schema({
  title: String,
  body: String
});

const Journal = mongoose.model("Journal", journalSchema);

// todo items define and bind
const itemsSchema = new mongoose.Schema({
  name: String
});

const Item = mongoose.model("Item", itemsSchema);

// Create items
const item1 = new Item({
  name: "Welcome!"
});
const item2 = new Item({
  name: "Click + to add new item."
});
const item3 = new Item({
  name: "<-- check box to delete item"
});

const defaultItems = [item1, item2, item3];

// todo list define and bind
const listSchema = new mongoose.Schema({
  name: String,
  items: [itemsSchema]
});

const List = mongoose.model("List", listSchema);

// navigate to main portfolio page
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/route/index.html");
});

// navigate to Journal home page and render DB items
app.get("/home", (req, res) => {
  Journal.find({})
  .then((foundItems) => {
    res.render("journalHome", {
      startingContent: "Lorem ipsum dolor sit amet, consectetur adipiscing elit , sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo",
      foundItems: foundItems
    });
  })
  .catch((err) => {
    console.log(err);
  });
});

// navigate to Journal compose page
app.get("/compose", (req, res) => {
  res.sendFile(path.join(__dirname, "/public/route/journalCompose.html"));
});

// get entry and store it into list
app.post("/compose", (req, res) => {
  Journal.create({
    title: req.body.postTitle,
    body: req.body.postBody
  });
  res.redirect("/home");
});

// navigate to specific journal page
app.get("/posts/:itemid", (req, res) => {
  Journal.findOne({_id: req.params.itemid})
    .then((item) => {
      res.render("journalPost", {
        itemTitle: item.title,
        itemBody: item.body
      });
    })
    .catch((err) => {
      console.log(err);
    });
});

// navigate todo page
app.get("/todo", (req, res) => {
   // check the items in the DB
   Item.find({})
   .then((foundItems) => {

       //if non found add items to DB
       if (foundItems.length === 0) {
           Item.insertMany(defaultItems)
           .then(() => {
           })
           .catch((err) => {
               console.log(`Error: ${err}`);
           });

           // restart if just added fresh to recheck and take
           res.redirect("todo");
       } else {

           // add the found items to render
           res.render("todo", {
               listTitle: "Today", 
               foundListItem: foundItems
           });
       }
   })
   .catch((err) => {
           console.log(`Error: ${err}`);
       });
});

// check which param the user wants
// user can enter /work parameter for example
app.get("/todo/:customListName", (req, res) => {
  // assign list name to constant
  const customListName = _.capitalize(req.params['customListName']);
  // must not be favicon
  if (customListName != "favicon.ico")  {
      // search if list exists
      List.findOne({name: customListName})
      .then((foundList) => {
          if (!foundList) {
              // create new list
              const list = new List({
                  name: customListName,
                  items: defaultItems
              });
              list.save();
              res.redirect("/todo" + customListName);

          } else {
              // show existing list with listFound
              res.render("todo", {
                  listTitle: foundList.name, 
                  foundListItem: foundList.items
              });
          };
      })
      .catch((err) => {
          console.log(`Error: ${err}`);
      });
  };
});

app.post("/todo", (req, res) => {  // input content storage
  const itemName = req.body.newItem;
  // list name
  const listName = req.body.list;
  // create item in DB, add item body
  const item = new Item({
      name: itemName
  });

  if (listName === "Today") {
      // save DB
      item.save();
      // refresh page
      res.redirect("todo#contact");
  } else {
      List.findOne({name: listName})
      .then((foundList) => {
          foundList.items.push(item);
          foundList.save();
          res.redirect("todo" + listName);
      })
  }
});

// deleting checked boxes **
app.post("/delete", (req, res) => {
  // get location of request
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;

  if (listName === "Today") {
      Item.findByIdAndDelete(checkedItemId)
      .then(() => {
      })
      .catch((err) => {
          console.log(`Error: ${err}`);
      });
      res.redirect("todo#contact");
  } else {
      List.findOneAndUpdate(
          {name: listName},
          {$pull: {items: {_id: checkedItemId}}}
      )
      .then((foundList) => {
          res.redirect("todo" + listName);
      })
      .catch((err) => {
          console.log(err);
      });
  };
});

// weather api navigate
app.get("/weather", (req, res) => {
  res.sendFile(__dirname + "/public/route/weatherIndex.html");
});

// search and request city
app.post("/weather", (req, res) => {
  const query = req.body.cityName;
  const queryUpper = query.charAt(0).toUpperCase() + query.slice(1);
  const unit = "metric";
  const url = "https://api.openweathermap.org/data/2.5/weather?q=" + query + "&appid=" + process.env.API_KEY + "&units=" + unit;

  https.get(url, function(response) {
    // receive data
    response.on("data", (data) => {
      const weatherData = JSON.parse(data);
      const temp = weatherData.main.temp;
      const description = weatherData.weather[0].description;
      const descriptionUpper = description.charAt(0).toUpperCase() + description.slice(1);

      var icon = weatherData.weather[0].icon;
      var iconURL = "https://openweathermap.org/img/wn/" + icon + "@4x.png";
      // write data
      res.write(`<p>The weather is currently ${descriptionUpper}<p>`);
      res.write(`<img src=${iconURL}>`);
      res.write(`<h1>The temperature in ${queryUpper} is ${temp}&deg; degrees Celcius</h1>`);
      res.write(`<a style="color: #3599fd; text-decoration: inherit;" href="/weather"><h4>Back to Weather</h4></a>`)
      res.write(`<a style="color: inherit; text-decoration: inherit;" href="/"><h4>Go to Portfolio</h4></a>`)
      res.write(`<a style="color: inherit; text-decoration: inherit;" href="/todo"><h4>Todo List?</h4></a>`)
      res.write(`<a style="color: inherit; text-decoration: inherit;" href="/home"><h4>Or Journal Page?</h4></a>`)
      res.send();
    });
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});


