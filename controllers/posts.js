const cloudinary = require("../middleware/cloudinary");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const User = require("../models/User")

module.exports = {
  getProfile: async (req, res) => {
    try {
      const posts = await Post.find({ user: req.user.id });
      res.render("profile.ejs", { posts: posts, user: req.user });
    } catch (err) {
      console.log(err);
    }
  },
  getFeed: async (req, res) => {
    try {
      const posts = await Post.find().sort({ createdAt: "desc" }).lean();
      res.render("feed.ejs", { posts: posts, user: req.user });
    } catch (err) {
      console.log(err);
    }
  },
  getMyTrips: async (req, res) => {
    try {
      const posts = await Post.find({ user: req.user.id });
      res.render("mytrips.ejs", { posts: posts, user: req.user });
    } catch (err) {
      console.log(err);
    }
  },
  getNewTrip: async (req, res) => {
    try {
      const posts = await Post.find({ user: req.user.id });
      res.render("newtrip.ejs", { posts: posts, user: req.user });
    } catch (err) {
      console.log(err);
    }
  },
  getTemplate: async (req, res) => {
    try {
      const posts = await Post.find().sort({ createdAt: "desc" }).lean();
      res.render("template.ejs", { posts: posts });
    } catch (err) {
      console.log(err);
    }
  },
  getPost: async (req, res) => {
    try {
      const post = await Post.findById(req.params.id);
      const comments = await Comment.find({post: req.params.id}).sort({ createdAt: "desc" }).populate('user').lean();
      res.render("post.ejs", { post: post, user: req.user, comments: comments });
    } catch (err) {
      console.log(err);
    }
  },
  createPost: async (req, res) => {
    try {
      // Upload image to cloudinary
      const result = await cloudinary.uploader.upload(req.file.path);

      await Post.create({
        title: req.body.title,
        image: result.secure_url,
        cloudinaryId: result.public_id,
        caption: req.body.caption,
        likes: 0,
        user: req.user.id,
      });
      console.log("Post has been added!");
      res.redirect("/profile");
    } catch (err) {
      console.log(err);
    }
  },
  likePost: async (req, res) => {
    try {
      let post = await Post.findById({ _id: req.params.id });
      if (post.likedBy.includes(req.user.id)) {
        //If user has already liked the post, remove their like
        console.log('User already liked this')
        await Post.findOneAndUpdate(
          { _id: req.params.id },
          {
            $inc: { likes: -1 },
            $pull: { likedBy: req.user.id}
          }
        );
        //Update poster's like count
        await User.findOneAndUpdate(
          { _id: post.user },
          {
            $inc: { likes: -1 },
          }
        );
        console.log("Likes -1");
        res.redirect(`/post/${req.params.id}`);
      } else {
        //Otherwise, add a like
        await Post.findOneAndUpdate(
          { _id: req.params.id },
          {
            $inc: { likes: 1 },
            $addToSet: { likedBy: req.user.id}
          }
        );
        //Update poster's like count
        await User.findOneAndUpdate(
         { _id: post.user },
            {
              $inc: { likes: 1 },
            }
        );
        console.log("Likes +1");
        res.redirect(`/post/${req.params.id}`);
      }
    } catch (err) {
      console.log(err);
    }
  },
  deletePost: async (req, res) => {
    try {
      // Find post by id
      let post = await Post.findById({ _id: req.params.id });
      // Delete image from cloudinary
      await cloudinary.uploader.destroy(post.cloudinaryId);
      // Delete post from db
      await Post.remove({ _id: req.params.id });
      console.log("Deleted Post");
      res.redirect("/profile");
    } catch (err) {
      res.redirect("/profile");
    }
  },
};
