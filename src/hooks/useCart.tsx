import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
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

  const prevCartRef = useRef<Product[]>();

  useEffect(() => {
    prevCartRef.current = cart;
  }, [])

  //? Na primeira passagem, se o da esquerda foi null ou undefined -> é atribuido o valor da direita
  //? Na segundo passagem, vai ter o valor anterior, ou seja nao vai mais ser undefined
  const cartPreviousValue = prevCartRef.current ?? cart;

  useEffect(() => {//? Altera o valor, sempre que for atualizado
    if (cartPreviousValue !== cart) {
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    }
  }, [cart, cartPreviousValue])



  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productExists = updatedCart.find(product => product.id === productId); //verifica se o produto existe no carrinho

      const stock = await api.get(`/stock/${productId}`);

      const stockAmount = stock.data.amount;
      const currentAmount = productExists ? productExists.amount : 0;
      const amount = currentAmount + 1;

      if (amount > stockAmount) {// verifica se tem a quantidade solicitada no estoque
        toast.error('Erro na adição do produto');
        return;
      }

      if (productExists) {
        productExists.amount = amount;
      } else {
        const product = await api.get(`/products/${productId}`)

        const newProduct = {
          ...product.data,
          amount: 1
        }
        updatedCart.push(newProduct);
      }

      setCart(updatedCart);
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productIndex = updatedCart.findIndex(product => product.id === productId); //Com o findIndex, pode usar o splice para remover

      if (productIndex >= 0) { //Se nao encontrar -> findIndex retorna -1
        updatedCart.splice(productIndex, 1);
        setCart(updatedCart);
      } else {
        throw new Error();
      }
    } catch {
      toast.error("Erro na remocao do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const stock = await api.get(`/stock/${productId}`);

      const stockAmount = stock.data.amount;

      if (amount > stockAmount) {
        toast.error("Quantidade fora de estoque");
        return;
      }

      const updatedCart = [...cart]; //? Para manter a imutabilidade
      const productExists = updatedCart.find(product => product.id === productId);

      if (productExists) {
        productExists.amount = amount;
        setCart(updatedCart);
      } else {
        throw Error();
      }

    } catch {
      toast.error("Erro na alteracao de quantidade do produto");
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
