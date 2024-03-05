'use client'

import { FC, useEffect, useState } from 'react'

import { ContractIds } from '@/deployments/deployments'
import { zodResolver } from '@hookform/resolvers/zod'
import FlipperContract from '../../../../typedContracts/flipper/contracts/flipper'
import abi from '../../../../artifacts/flipper/flipper.json'
import swankyLocalConfig from '../../../../swanky.config.json'
import {
  contractQuery,
  decodeOutput, useContract,
  useInkathon,
  useRegisteredTypedContract,
} from '@scio-labs/use-inkathon'
import { SubmitHandler, useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import * as z from 'zod'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Form, FormControl, FormItem, FormLabel } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { contractTxWithToast } from '@/utils/contract-tx-with-toast'

const formSchema = z.object({
  newMessage: z.string().min(1).max(90),
})

export const FlipperContractInteractions: FC = () => {
  const { api, activeAccount, activeSigner } = useInkathon()
  const deployments = swankyLocalConfig.contracts['flipper'].deployments;
  const address = deployments[deployments.length - 1].address;
  const { contract, address: contractAddress } = useContract(abi, address)
  const { typedContract } = useRegisteredTypedContract(ContractIds.Flipper, FlipperContract)
  const [flipperValue, setFlipperValue] = useState<boolean>()
  const [fetchIsLoading, setFetchIsLoading] = useState<boolean>()
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  })

  const { register, reset, handleSubmit } = form


  // Fetch Greeting
  const fetchFlipperValue = async () => {
    if (!contract || !typedContract || !api) return

    setFetchIsLoading(true)
    try {
      const result = await contractQuery(api, '', contract, 'get')
      const { output, isError, decodedOutput } = decodeOutput(result, contract, 'get')
      if (isError) throw new Error(decodedOutput)
      setFlipperValue(output)

      console.log('Result from contract: ', output)

      // Alternatively: Fetch it with typed contract instance
      const typedResult = await typedContract.query.get()
      console.log('Result from typed contract: ', typedResult.value)
    } catch (e) {
      console.error(e)
      toast.error('Error while fetching greeting. Try again…')
      setFlipperValue(undefined)
    } finally {
      setFetchIsLoading(false)
    }
  }
  useEffect(() => {
    fetchFlipperValue()
  }, [typedContract])

  // Update Greeting
  const flipValue: SubmitHandler<z.infer<typeof formSchema>> = async ( ) => {
    if (!activeAccount || !contract || !activeSigner || !api) {
      toast.error('Wallet not connected. Try again…')
      return
    }

    try {
      await contractTxWithToast(api, activeAccount.address, contract, 'flip', {}, [])
      reset()
    } catch (e) {
      console.error(e)
    } finally {
      await fetchFlipperValue()
    }
  }

  if (!api) return null

  return <>
    <div className="flex max-w-[22rem] grow flex-col gap-4">
      <h2 className="text-center font-mono text-gray-400">Flipper Smart Contract</h2>

      <Form {...form}>
        {/* Fetched Greeting */}
        <Card>
          <CardContent className="pt-6">
            <FormItem>
              <FormLabel className="text-base">Fetched Flipper Value</FormLabel>
              <FormControl>
                <Input
                  placeholder={fetchIsLoading || !contract ? 'Loading…' : flipperValue ? 'True' : 'False'}
                  disabled={true}
                />
              </FormControl>
            </FormItem>
          </CardContent>
        </Card>

        {/* Update Greeting */}
        <Card>
          <CardContent className="pt-6">
            <form
              onSubmit={handleSubmit(flipValue)}
              className="flex flex-col justify-end gap-2"
            >
              <FormItem>
                <FormLabel className="text-base">Flip Value</FormLabel>
                <FormControl>
                  <div className="flex gap-2">
                    <Input className="hidden" disabled={form.formState.isSubmitting} defaultValue={" "} {...register('newMessage')} />
                    <Button
                      type="submit"
                      className="bg-primary font-bold flex-1"
                      disabled={fetchIsLoading || form.formState.isSubmitting}
                      >
                      Submit
                    </Button>
                  </div>
                </FormControl>
              </FormItem>
            </form>
          </CardContent>
        </Card>
      </Form>

      {/* Contract Address */}
      <p className="text-center font-mono text-xs text-gray-600">
        {contract ? contractAddress : 'Loading…'}
      </p>
    </div>
  </>
}