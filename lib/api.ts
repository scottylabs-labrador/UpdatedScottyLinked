import { supabase } from './supabaseClient';
import { Post, Opportunity, Profile, UserProfile } from '../types';

// ==================== POSTS ====================
export const fetchPosts = async (): Promise<Post[]> => {
  try {
    // TODO: Uncomment when database is ready
    // const { data, error } = await supabase
    //   .from('posts')
    //   .select('*')
    //   .order('created_at', { ascending: false });
    // 
    // if (error) throw error;
    // return data || [];

    // Mock data for now
    return [
      {
        id: 1,
        author: "Sarah Chen",
        major: "Computer Science '25",
        avatar: "SC",
        timestamp: "2 hours ago",
        content: "Just finished my research project on distributed systems! Looking for teammates for a startup idea I've been working on. DM me if interested! 🚀",
        likes: 24,
        comments: 8
      },
      {
        id: 2,
        author: "Michael Torres",
        major: "Electrical Engineering '24",
        avatar: "MT",
        timestamp: "5 hours ago",
        content: "Shoutout to Professor Johnson's robotics class - learned so much this semester! Anyone else taking advanced ML next semester?",
        likes: 31,
        comments: 12
      }
    ];
  } catch (error) {
    console.error('Error fetching posts:', error);
    return [];
  }
};

export const createPost = async (content: string, userId: string): Promise<boolean> => {
  try {
    // TODO: Uncomment when database is ready
    // const { error } = await supabase
    //   .from('posts')
    //   .insert([{ content, user_id: userId }]);
    // 
    // if (error) throw error;
    // return true;

    console.log('Creating post:', content, userId);
    return true;
  } catch (error) {
    console.error('Error creating post:', error);
    return false;
  }
};

// ==================== OPPORTUNITIES ====================
export const fetchOpportunities = async (): Promise<Opportunity[]> => {
  try {
    // TODO: Uncomment when database is ready
    // const { data, error } = await supabase
    //   .from('opportunities')
    //   .select('*')
    //   .order('posted_at', { ascending: false });
    // 
    // if (error) throw error;
    // return data || [];

    // Mock data for now
    return [
      {
        id: 1,
        title: "Software Engineering Intern",
        company: "Meta",
        type: "Internship",
        location: "Menlo Park, CA",
        posted: "2 days ago",
        skills: ["React", "Python", "AWS"],
        description: "Join our infrastructure team working on cutting-edge distributed systems."
      },
      {
        id: 2,
        title: "Research Assistant - AI Lab",
        company: "CMU Robotics Institute",
        type: "Research",
        location: "Pittsburgh, PA",
        posted: "1 week ago",
        skills: ["Machine Learning", "PyTorch", "Computer Vision"],
        description: "Work with Dr. Smith on autonomous navigation systems for mobile robots."
      }
    ];
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    return [];
  }
};

// ==================== PROFILES ====================
export const fetchProfiles = async (): Promise<Profile[]> => {
  try {
    // TODO: Uncomment when database is ready
    // const { data, error } = await supabase
    //   .from('profiles')
    //   .select('*');
    // 
    // if (error) throw error;
    // return data || [];

    // Mock data for now
    return [
      {
        id: 1,
        name: "Emily Rodriguez",
        avatar: "ER",
        major: "Business Administration",
        year: "Junior",
        skills: ["Marketing", "Data Analysis", "Public Speaking"],
        bio: "Passionate about tech entrepreneurship and social impact.",
        connections: 234
      },
      {
        id: 2,
        name: "James Park",
        avatar: "JP",
        major: "Mechanical Engineering",
        year: "Senior",
        skills: ["CAD", "3D Printing", "Robotics"],
        bio: "Building the future, one prototype at a time.",
        connections: 189
      }
    ];
  } catch (error) {
    console.error('Error fetching profiles:', error);
    return [];
  }
};

// ==================== CURRENT USER ====================
export const fetchCurrentUser = async (userId?: string): Promise<UserProfile | null> => {
  try {
    // TODO: Uncomment when database is ready
    // if (!userId) return null;
    // const { data, error } = await supabase
    //   .from('profiles')
    //   .select('*')
    //   .eq('id', userId)
    //   .single();
    // 
    // if (error) throw error;
    // return data;

    // Mock data for now
    return {
      name: "Alex Johnson",
      avatar: "AJ",
      major: "Computer Science",
      year: "Sophomore",
      email: "ajohnson@andrew.cmu.edu",
      skills: ["JavaScript", "Python", "React", "Node.js", "Machine Learning"],
      bio: "Full-stack developer interested in AI and web technologies. Always looking to collaborate on interesting projects!",
      connections: 156,
      gpa: "3.8"
    };
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
};

export const updateUserProfile = async (userId: string, updates: Partial<UserProfile>): Promise<boolean> => {
  try {
    // TODO: Uncomment when database is ready
    // const { error } = await supabase
    //   .from('profiles')
    //   .update(updates)
    //   .eq('id', userId);
    // 
    // if (error) throw error;
    // return true;

    console.log('Updating profile:', userId, updates);
    return true;
  } catch (error) {
    console.error('Error updating profile:', error);
    return false;
  }
};

// ==================== CONNECTIONS ====================
export const createConnection = async (userId: string, targetUserId: string): Promise<boolean> => {
  try {
    // TODO: Uncomment when database is ready
    // const { error } = await supabase
    //   .from('connections')
    //   .insert([{ user_id: userId, connected_user_id: targetUserId, status: 'pending' }]);
    // 
    // if (error) throw error;
    // return true;

    console.log('Creating connection:', userId, targetUserId);
    return true;
  } catch (error) {
    console.error('Error creating connection:', error);
    return false;
  }
};