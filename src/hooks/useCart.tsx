import { createContext, ReactNode, useContext, useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {

  const [cart, setCart] = useState<Product[]>(() => {
     const storagedCart = localStorage.getItem('@RocketShoes:cart');
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    return [];
  });

  function settingCartAndSettingStorage(dataCart:Product[], textAlert:string){
    setCart(dataCart);
    window.localStorage.setItem('@RocketShoes:cart', JSON.stringify(dataCart))
    if(textAlert !== "noneText"){
      toast.success(textAlert);
    }
  }

  const addProduct = async (productId: number) => {
    try {
      const alredyProductInCart = cart.find((item)=> item.id === productId);
      if(!alredyProductInCart){
        //recebendo data mas passand para outro nome, como: product e stock
        const {data: product} = await api.get<Product>(`products/${productId}`);
        const {data: stock} = await api.get<Product>(`stock/${productId}`);
        const {amount} = stock;
        if(amount > 0){
          settingCartAndSettingStorage([...cart, {...product, amount: 1}], "Produto adicionado com sucesso!");
        }
      }else{
        const {data: stock} = await api.get<Product>(`stock/${productId}`);
        const {amount} = stock;
        if(amount > alredyProductInCart.amount){
          const newCart = cart.map(item => {
            return (item.id === productId) ? {...item, amount: Number(item.amount + 1)} : item;
          });
          settingCartAndSettingStorage(newCart, "Produto adicionado com sucesso!");
        }else{
          toast.error('Quantidade solicitada fora de estoque');
        }
      }

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productExist = cart.some((item)=> item.id === productId)
      console.log(productExist);
      if(!productExist){
        toast.error('Erro na remoção do produto');
        return;
      }
      const productUpdated = cart.filter((item)=>{   return item.id !== productId; })
      settingCartAndSettingStorage(productUpdated, "Produto removido com sucesso!");
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({productId,amount}: UpdateProductAmount) => {
    try {
      if(amount < 1){
        toast.error("Erro na alteração de quantidade do produto");
        return;
      }
      const {data} = await api.get(`/stock/${productId}`);
      const stockAmount = (data.amount);            
      
      if(amount > stockAmount){
        toast.error('Quantidade solicitada fora de estoque');
        return;
      };
      
      const isThereSomeProduct = cart.some((item)=> item.id === productId)
      if(!isThereSomeProduct){
        toast.error("Erro na alteração de quantidade do produto");
        return;
      }

      const newProduct = cart.map((item)=>{
        return (item.id === productId) ? {...item, amount:amount} : item;
      });
      settingCartAndSettingStorage(newProduct, "noneText");
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);
  return context;
}
