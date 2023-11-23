const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "userData.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

// CREATE USER

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  const selectUserQuery = `
    
    SELECT 
    *
    FROM 
    user 
    WHERE 
    username = '${username}';

    `;
  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    //create user in table
    if (password.length < 5) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const createUserQuery = `
        
        INSERT INTO 
        user (username,name,password,gender,location)
        VALUES 
        (
            '${username}',
            '${name}',
            '${hashedPassword}',
            '${gender}',
            '${location}'
        )

        `;
      await db.run(createUserQuery);
      response.status(200);
      response.send("User created successfully");
    }
  } else {
    // send invalid username

    response.status(400);
    response.send("User already exists");
  }
});

module.exports = app;

// login User

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const userDbQuery = `
    
    SELECT 
    * 
    FROM 
    user 
    WHERE 
    username = '${username}'
    `;
  const dbUser = await db.get(userDbQuery);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordValid = await bcrypt.compare(password, dbUser.password);

    if (isPasswordValid === true) {
      response.status(200);
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//change password

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;

  const getUserQuery = `
    
    SELECT 
    *
    FROM 
    user
    WHERE 
    username = '${username}'
    
    `;
  const dbUser = await db.get(getUserQuery);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordCorrect = await bcrypt.compare(
      oldPassword,
      dbUser.password
    );
    if (isPasswordCorrect === true) {
      const updatedPassword = await bcrypt.hash(newPassword, 10);
      if (newPassword.length < 5) {
        response.status(400);
        response.send("Password is too short");
      } else {
        const updatedUserQuery = `
            UPDATE 
            user 
            SET 
            password = '${updatedPassword}'
            WHERE 
            username = '${username}'
            `;
        const dbUser = await db.run(updatedUserQuery);
        response.send("Password updated");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});
