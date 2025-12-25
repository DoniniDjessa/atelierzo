import { supabase } from './client';

/**
 * Register a user with phone number - directly stores in database
 * No phone authentication required, just stores the phone number and name
 * @param phoneNumber - Phone number in E.164 format
 * @param name - User's full name
 */
export async function registerWithPhone(phoneNumber: string, name: string) {
  try {
    const cleanPhone = phoneNumber.trim();
    
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('zo-users')
      .select('id, phone')
      .eq('phone', cleanPhone)
      .single();

    if (existingUser) {
      return { 
        data: existingUser, 
        error: { message: 'Ce numéro de téléphone est déjà enregistré.' } 
      };
    }

    // Insert new user directly into database (id will be auto-generated)
    const { data, error } = await supabase
      .from('zo-users')
      .insert({
        phone: cleanPhone,
        name: name,
        // id is not included - will use DEFAULT gen_random_uuid()
      })
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error: any) {
    console.error('Registration error:', error);
    return { data: null, error };
  }
}

/**
 * Login with phone number - checks if user exists in database
 * @param phoneNumber - Phone number in E.164 format
 */
export async function loginWithPhone(phoneNumber: string) {
  try {
    const cleanPhone = phoneNumber.trim();
    
    // Check if user exists
    const { data, error } = await supabase
      .from('zo-users')
      .select('id, phone, name')
      .eq('phone', cleanPhone)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No user found
        return { 
          data: null, 
          error: { message: 'Aucun compte trouvé avec ce numéro de téléphone.' } 
        };
      }
      throw error;
    }

    if (!data) {
      return { 
        data: null, 
        error: { message: 'Aucun compte trouvé avec ce numéro de téléphone.' } 
      };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Login error:', error);
    return { data: null, error };
  }
}

